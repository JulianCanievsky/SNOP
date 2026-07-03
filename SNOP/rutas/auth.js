import { createClient } from '@supabase/supabase-js'
import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
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
    return res.status(400).json({ error: 'Email y contraseña requeridos' })
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
        error: `Este correo no corresponde al rol ${roles[tipo_usuario_id] || tipo_usuario_id}`
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
        // Migrar a bcrypt automáticamente
        const hash = await bcrypt.hash(password, 10)
        await supabase.from('users').update({ password: hash }).eq('id', usuario.id)
      }
    }

    if (!passwordOk) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' })
    }

    // Generar JWT propio
    const token = jwt.sign(
      { id: usuario.id, tipo_usuario_id: usuario.tipo_usuario_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    // No devolver el hash de la contraseña
    const { password: _pw, ...perfil } = usuario

    res.json({ data: perfil, token })
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

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña requeridos' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
  }

  try {
    // Verificar que no exista
    const { data: existe } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    if (existe) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo electrónico' })
    }

    const hash = await bcrypt.hash(password, 10)

    const { data: nuevo, error: insertError } = await supabase
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

    res.status(201).json({ data: nuevo, message: '¡Cuenta creada! Ya podés iniciar sesión.' })
  } catch (err) {
    console.error('POST /api/auth/registro', err)
    res.status(500).json({ error: 'Error al crear la cuenta' })
  }
})

export default router
