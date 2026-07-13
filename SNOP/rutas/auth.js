import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const router = express.Router()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Compara email + password contra la tabla users (bcrypt).
// Devuelve un JWT propio firmado con JWT_SECRET.
router.post('/login', async (req, res) => {
  const { email, password, tipo_usuario_id } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' })
  }

  try {
    // Traer el usuario con su password hash
    const { data: usuario, error } = await supabase
      .from('users')
      .select('id, nombre, email, password, tipo_usuario_id, club_id, activo, cuota_al_dia, foto_url')
      .eq('email', email.trim().toLowerCase())
      .single()

    if (error || !usuario) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' })
    }

    if (!usuario.activo) {
      return res.status(403).json({ error: 'Tu cuenta está desactivada. Contactá al club.' })
    }

    // Verificar rol seleccionado
    if (tipo_usuario_id && usuario.tipo_usuario_id !== tipo_usuario_id) {
      const roles = { 1: 'Socio', 2: 'Entrenador', 3: 'Administrador' }
      return res.status(403).json({
        error: `Este correo no corresponde al rol ${roles[tipo_usuario_id] ?? tipo_usuario_id}`
      })
    }

    // Comparar contraseña
    // Soporta dos casos:
    //   a) hash bcrypt almacenado (empieza con $2b$ o $2a$)
    //   b) contraseña en texto plano (usuarios legacy / recién migrados)
    let passwordOk = false
    if (usuario.password && (usuario.password.startsWith('$2b$') || usuario.password.startsWith('$2a$'))) {
      passwordOk = await bcrypt.compare(password, usuario.password)
    } else {
      // Texto plano — comparación directa y luego migrar a hash
      passwordOk = usuario.password === password
      if (passwordOk) {
        const hash = await bcrypt.hash(password, 10)
        await supabase.from('users').update({ password: hash }).eq('id', usuario.id)
      }
    }

    if (!passwordOk) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' })
    }

    // Generar JWT propio
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, tipo_usuario_id: usuario.tipo_usuario_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Nunca devolver el hash de la contraseña
    const { password: _pw, ...perfil } = usuario

    res.json({ token, user: perfil })

  } catch (err) {
    console.error('POST /api/auth/login', err)
    res.status(500).json({ error: 'Error interno al iniciar sesión' })
  }
})

// ─── POST /api/auth/registro ──────────────────────────────────────────────────
// Crea un usuario nuevo en la tabla users con password hasheado.
// Solo para socios (tipo_usuario_id = 1).
router.post('/registro', async (req, res) => {
  const { nombre, email, password } = req.body

  if (!nombre?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: 'Completá todos los campos' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
  }

  try {
    // Verificar que no exista
    const { data: existente } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    if (existente) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo electrónico' })
    }

    const hash = await bcrypt.hash(password, 10)

    const { data: nuevoUsuario, error: insertError } = await supabase
      .from('users')
      .insert({
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        password: hash,
        tipo_usuario_id: 1,   // socio por defecto
        activo: true,
        cuota_al_dia: true,
        fecha_alta: new Date().toISOString(),
      })
      .select('id, nombre, email, tipo_usuario_id, club_id, activo, cuota_al_dia, foto_url')
      .single()

    if (insertError) throw insertError

    res.status(201).json({
      mensaje: '¡Cuenta creada! El entrenador te asignará tu nivel. Ya podés iniciar sesión.',
      user: nuevoUsuario,
    })

  } catch (err) {
    console.error('POST /api/auth/registro', err)
    res.status(500).json({ error: 'Error al crear la cuenta' })
  }
})

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
// Genera un token de reset (JWT, expira en 1h) y devuelve el link.
// En producción con SMTP configurado, también envía el email.
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body

  if (!email?.trim()) {
    return res.status(400).json({ error: 'El correo es requerido' })
  }

  try {
    const { data: usuario } = await supabase
      .from('users')
      .select('id, nombre, email, activo')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    // Siempre responder igual para no revelar si el email existe o no
    const RESPUESTA_OK = { mensaje: 'Si el correo está registrado, recibirás un link para restablecer tu contraseña.' }

    if (!usuario || !usuario.activo) {
      return res.json(RESPUESTA_OK)
    }

    // Generar token firmado con el hash actual de la password como secret extra
    // (si la password cambia, el token queda inválido automáticamente)
    const { data: usuarioConPw } = await supabase
      .from('users')
      .select('password')
      .eq('id', usuario.id)
      .single()

    const secretReset = `${process.env.JWT_SECRET}-${usuarioConPw.password}`
    const resetToken = jwt.sign(
      { id: usuario.id, email: usuario.email },
      secretReset,
      { expiresIn: '1h' }
    )

    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
    const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`

    // ── Enviar email ───────────────────────────────────────────────────────
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)

        await resend.emails.send({
          from:    process.env.RESEND_FROM || 'SNOP Club <onboarding@resend.dev>',
          to:      usuario.email,
          subject: 'Restablecé tu contraseña — SNOP',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8f9fc;border-radius:12px;">
              <h2 style="color:#1256b0;margin:0 0 8px;">Restablecé tu contraseña</h2>
              <p style="color:#555;margin:0 0 24px;">Hola <strong>${usuario.nombre}</strong>, recibimos una solicitud para restablecer tu contraseña.</p>
              <a href="${resetLink}"
                 style="display:inline-block;padding:14px 28px;background:#1a6fd4;color:#fff;border-radius:28px;text-decoration:none;font-weight:700;font-size:15px;">
                Restablecer contraseña
              </a>
              <p style="color:#999;font-size:12px;margin-top:24px;">
                Este link expira en <strong>1 hora</strong>.<br>
                Si no solicitaste este cambio, ignorá este email.
              </p>
            </div>
          `,
        })
      } catch (emailErr) {
        console.error('Error enviando email con Resend:', emailErr)
        // No bloqueamos la respuesta si el email falla
      }
    } else {
      // Sin API key — loguear el link en consola (desarrollo)
      console.log(`\n🔑 RESET LINK para ${usuario.email}:\n${resetLink}\n`)
    }

    res.json(RESPUESTA_OK)

  } catch (err) {
    console.error('POST /api/auth/forgot-password', err)
    res.status(500).json({ error: 'Error al procesar la solicitud' })
  }
})

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
// Verifica el token y actualiza la contraseña.
// Body: { token, password }
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body

  if (!token || !password) {
    return res.status(400).json({ error: 'Token y contraseña son requeridos' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
  }

  try {
    // Decodificar sin verificar para obtener el id
    const decoded = jwt.decode(token)
    if (!decoded?.id) {
      return res.status(400).json({ error: 'Token inválido' })
    }

    // Traer password actual para reconstruir el secret
    const { data: usuario } = await supabase
      .from('users')
      .select('id, email, password, activo')
      .eq('id', decoded.id)
      .single()

    if (!usuario || !usuario.activo) {
      return res.status(400).json({ error: 'Token inválido o expirado' })
    }

    // Verificar el token con el secret que incluye el hash actual
    const secretReset = `${process.env.JWT_SECRET}-${usuario.password}`
    jwt.verify(token, secretReset) // lanza si expiró o es inválido

    // Hashear la nueva contraseña y guardar
    const hash = await bcrypt.hash(password, 10)
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hash })
      .eq('id', usuario.id)

    if (updateError) throw updateError

    res.json({ mensaje: 'Contraseña actualizada correctamente. Ya podés iniciar sesión.' })

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'El link expiró. Solicitá uno nuevo.' })
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Token inválido' })
    }
    console.error('POST /api/auth/reset-password', err)
    res.status(500).json({ error: 'Error al restablecer la contraseña' })
  }
})

export default router
