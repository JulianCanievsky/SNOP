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

// ─── POST /api/auth/login ───────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password, tipo_usuario_id } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' })
  }

  try {
    // Busca el usuario en la tabla users (no en Supabase Auth)
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

    // Verifica la contraseña contra el hash guardado
    const esValida = await bcrypt.compare(password, usuario.password)
    if (!esValida) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' })
    }

    // Valida el rol si se envió
    if (tipo_usuario_id && usuario.tipo_usuario_id !== tipo_usuario_id) {
      const roles = { 1: 'Socio', 2: 'Entrenador', 3: 'Administrador' }
      return res.status(403).json({
        error: `Este correo no corresponde al rol ${roles[tipo_usuario_id] ?? tipo_usuario_id}`
      })
    }

    // Genera JWT propio (sin Supabase Auth)
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, tipo_usuario_id: usuario.tipo_usuario_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Nunca devolver el hash de la contraseña
    const { password: _pw, ...perfil } = usuario

    res.json({ token, user: perfil })

  } catch (err) {
    console.error('Error en /login:', err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ─── POST /api/auth/registro ────────────────────────────────────────────────
router.post('/registro', async (req, res) => {
  const { nombre, email, password } = req.body

  if (!nombre?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: 'Completá todos los campos' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
  }

  try {
    // Verifica si el email ya existe
    const { data: existente } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    if (existente) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo electrónico' })
    }

    // Encripta la contraseña
    const hash = await bcrypt.hash(password, 12)

    // Inserta el nuevo usuario
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
      .select('id, nombre, email, tipo_usuario_id, activo, cuota_al_dia')
      .single()

    if (insertError) {
      console.error('Error al insertar usuario:', insertError)
      return res.status(500).json({ error: 'Error al crear la cuenta' })
    }

    res.status(201).json({
      mensaje: '¡Cuenta creada! El entrenador te asignará tu nivel. Ya podés iniciar sesión.',
      user: nuevoUsuario,
    })

  } catch (err) {
    console.error('Error en /registro:', err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

export default router
