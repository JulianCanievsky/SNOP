// Solo deshabilitar validación SSL en desarrollo
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

import juegoLibreRoutes         from './rutas/JuegoLibre.js'
import turnosRoutes             from './rutas/turnos.js'
import clasesParticularesRoutes from './rutas/clasesParticulares.js'
import perfilRouter             from './rutas/perfil.js'
import entrenadorRouter         from './rutas/entrenador.js'
import authRouter               from './rutas/auth.js'
import adminRouter              from './rutas/admin.js'
import agendaRouter             from './rutas/agenda.js'

dotenv.config()

const app = express()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

app.use(cors())
app.use(express.json())

app.use('/api/auth',                authRouter)
app.use('/api/admin',               adminRouter)

// Sedes públicas — sin auth, para socios
app.get('/api/sedes', async (_req, res) => {
  const { data, error } = await supabase.from('sedes').select('id, nombre').order('nombre')
  if (error) return res.status(500).json({ error: 'Error al obtener sedes' })
  res.json({ data: data ?? [] })
})

// Comunicados públicos — últimos 5 para la pantalla Inicio del socio
app.get('/api/comunicados', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('comunicados')
      .select('id, titulo, mensaje, fecha, destinatarios')
      .in('destinatarios', ['todos', 'con_deuda', 'nivel_rojo', 'nivel_azul'])
      .order('fecha', { ascending: false })
      .limit(5)
    if (error) {
      if (error.code === '42P01') return res.json({ data: [] })
      throw error
    }
    res.json({ data: data ?? [] })
  } catch (err) {
    console.error('GET /api/comunicados', err)
    res.status(500).json({ error: 'Error al obtener comunicados' })
  }
})

// Todos los comunicados para socios
app.get('/api/comunicados/todos', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('comunicados')
      .select('id, titulo, mensaje, fecha, destinatarios')
      .in('destinatarios', ['todos', 'con_deuda', 'nivel_rojo', 'nivel_azul'])
      .order('fecha', { ascending: false })
    if (error) {
      if (error.code === '42P01') return res.json({ data: [] })
      throw error
    }
    res.json({ data: data ?? [] })
  } catch (err) {
    console.error('GET /api/comunicados/todos', err)
    res.status(500).json({ error: 'Error al obtener comunicados' })
  }
})

app.use('/juego-libre',             juegoLibreRoutes)
app.use('/api/juego-libre',         juegoLibreRoutes)
app.use('/api/turnos',              turnosRoutes)
app.use('/api/agenda',              agendaRouter)
app.use('/api/clases-particulares', clasesParticularesRoutes)
app.use('/api/perfil',              perfilRouter)
app.use('/api/entrenador',          entrenadorRouter)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})
