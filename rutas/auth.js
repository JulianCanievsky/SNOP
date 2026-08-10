import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import supabase from '../src/config/db.js'

const router = express.Router()

const BCRYPT_ROUNDS = 12

// ── GET /api/auth/clubes — público, para poblar el selector en registro ────────
router.get('/clubes', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('clubes')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre')
    if (error) throw error
    res.json({ data: data ?? [] })
  } catch (err) {
    console.error('GET /api/auth/clubes', err)
    res.status(500).json({ error: 'Error al obtener clubes' })
  }
})

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password, tipo_usuario_id } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' })
  }

  try {
    const { data: usuario, error } = await supabase
      .from('users')
      .select('id, nombre, email, password, tipo_usuario_id, club_id, activo, estado_cuenta, cuota_al_dia, foto_url, nivel_id, niveles(id, nombre)')
      .eq('email', email.trim().toLowerCase())
      .single()

    if (error || !usuario) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' })
    }

    // Cuenta desactivada por el club
    if (!usuario.activo) {
      return res.status(403).json({ error: 'Tu cuenta está desactivada. Contactá al club.' })
    }

    // Cuenta pendiente de aprobación (nuevo estado, mensaje diferenciado)
    const estadoCuenta = usuario.estado_cuenta ?? 'activa'
    if (estadoCuenta === 'pendiente') {
      return res.status(403).json({
        error: 'Tu solicitud para unirte al club todavía no fue aprobada. Te avisaremos cuando esté lista.',
      })
    }

    if (estadoCuenta === 'desactivada') {
      return res.status(403).json({ error: 'Tu cuenta está desactivada. Contactá al club.' })
    }

    // Verificar rol seleccionado
    if (tipo_usuario_id && usuario.tipo_usuario_id !== tipo_usuario_id) {
      const roles = { 1: 'Socio', 2: 'Entrenador', 3: 'Administrador' }
      return res.status(403).json({
        error: `Este correo no corresponde al rol ${roles[tipo_usuario_id] ?? tipo_usuario_id}`,
      })
    }

    // Verificar contraseña
    if (
      !usuario.password ||
      (!usuario.password.startsWith('$2b$') && !usuario.password.startsWith('$2a$'))
    ) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' })
    }

    const passwordOk = await bcrypt.compare(password, usuario.password)
    if (!passwordOk) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' })
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, tipo_usuario_id: usuario.tipo_usuario_id, nivel_id: usuario.nivel_id ?? null },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    const { password: _pw, niveles, estado_cuenta: _ec, ...perfil } = usuario
    const perfilFinal = {
      ...perfil,
      nivel_id:     usuario.nivel_id ?? null,
      nivel_nombre: usuario.niveles?.nombre ?? null,
    }
    res.json({ token, user: perfilFinal })
  } catch (err) {
    console.error('POST /api/auth/login', err)
    res.status(500).json({ error: 'Error interno al iniciar sesión' })
  }
})

// ─── POST /api/auth/registro ──────────────────────────────────────────────────
router.post('/registro', async (req, res) => {
  const { nombre, email, password, club_id } = req.body

  if (!nombre?.trim() || !email?.trim() || !password || !club_id) {
    return res.status(400).json({ error: 'Completá todos los campos, incluyendo el club' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
  }

  try {
    const { data: existente } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    if (existente) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo electrónico' })
    }

    // Verificar que el club existe
    const { data: club, error: errClub } = await supabase
      .from('clubes')
      .select('id, nombre')
      .eq('id', club_id)
      .single()

    if (errClub || !club) {
      return res.status(400).json({ error: 'El club seleccionado no existe' })
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)

    // Crear usuario con estado_cuenta = 'pendiente' (sin acceso hasta aprobación)
    const { data: nuevoUsuario, error: insertError } = await supabase
      .from('users')
      .insert({
        nombre:          nombre.trim(),
        email:           email.trim().toLowerCase(),
        password:        hash,
        tipo_usuario_id: 1,
        activo:          true,          // activo = true, el bloqueo lo maneja estado_cuenta
        estado_cuenta:   'pendiente',
        cuota_al_dia:    false,
        fecha_alta:      new Date().toISOString(),
      })
      .select('id, nombre, email, tipo_usuario_id, club_id, activo, cuota_al_dia, foto_url, nivel_id')
      .single()

    if (insertError) throw insertError

    // Crear solicitud de ingreso al club
    await supabase
      .from('solicitudes_club')
      .insert({
        user_id:        nuevoUsuario.id,
        club_id:        Number(club_id),
        estado:         'pendiente',
        fecha_solicitud: new Date().toISOString(),
      })

    res.status(201).json({
      mensaje: `Solicitud enviada a ${club.nombre}. Te avisaremos cuando el admin la apruebe.`,
      user: { ...nuevoUsuario, nivel_nombre: null },
      pendiente: true,
    })
  } catch (err) {
    console.error('POST /api/auth/registro', err)
    res.status(500).json({ error: 'Error al crear la cuenta' })
  }
})

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body

  if (!email?.trim()) {
    return res.status(400).json({ error: 'El correo es requerido' })
  }

  const RESPUESTA_OK = {
    mensaje: 'Si el correo está registrado, recibirás un link para restablecer tu contraseña.',
  }

  try {
    const { data: usuario } = await supabase
      .from('users')
      .select('id, nombre, email, activo')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    if (!usuario || !usuario.activo) {
      return res.json(RESPUESTA_OK)
    }

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

    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: process.env.RESEND_FROM || 'SNOP Club <onboarding@resend.dev>',
          to: usuario.email,
          subject: 'Restablecé tu contraseña — SNOP',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8f9fc;border-radius:12px;">
              <h2 style="color:#1256b0;margin:0 0 8px;">Restablecé tu contraseña</h2>
              <p style="color:#555;margin:0 0 24px;">Hola <strong>${usuario.nombre}</strong>, recibimos una solicitud para restablecer tu contraseña.</p>
              <a href="${resetLink}" style="display:inline-block;padding:14px 28px;background:#1a6fd4;color:#fff;border-radius:28px;text-decoration:none;font-weight:700;font-size:15px;">
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
      }
    } else {
      console.log(`\n[DEV] RESET LINK para ${usuario.email}:\n${resetLink}\n`)
    }

    res.json(RESPUESTA_OK)
  } catch (err) {
    console.error('POST /api/auth/forgot-password', err)
    res.status(500).json({ error: 'Error al procesar la solicitud' })
  }
})

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body

  if (!token || !password) {
    return res.status(400).json({ error: 'Token y contraseña son requeridos' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
  }

  try {
    const decoded = jwt.decode(token)
    if (!decoded?.id) {
      return res.status(400).json({ error: 'Token inválido' })
    }

    const { data: usuario } = await supabase
      .from('users')
      .select('id, email, password, activo')
      .eq('id', decoded.id)
      .single()

    if (!usuario || !usuario.activo) {
      return res.status(400).json({ error: 'Token inválido o expirado' })
    }

    const secretReset = `${process.env.JWT_SECRET}-${usuario.password}`
    jwt.verify(token, secretReset)

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)
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
