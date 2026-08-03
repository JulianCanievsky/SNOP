// ─── Cargar variables de entorno primero ─────────────────────────────────────
import dotenv from 'dotenv'
dotenv.config()

// ─── Advertencia de SSL — solo deshabilitar en desarrollo ────────────────────
if (process.env.NODE_ENV !== 'production') {
  console.warn(
    '[ADVERTENCIA] NODE_TLS_REJECT_UNAUTHORIZED=0 activo.' +
    ' Asegurate de setear NODE_ENV=production en el servidor.'
  )
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
} else if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
  // En producción, si alguien seteó esto a mano, lo corregimos y avisamos.
  delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
  console.warn('[SEGURIDAD] NODE_TLS_REJECT_UNAUTHORIZED fue ignorado en producción.')
}

import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import supabase from './src/config/db.js'

import juegoLibreRoutes         from './rutas/JuegoLibre.js'
import turnosRoutes             from './rutas/turnos.js'
import clasesParticularesRoutes from './rutas/clasesParticulares.js'
import perfilRouter             from './rutas/perfil.js'
import entrenadorRouter         from './rutas/entrenador.js'
import authRouter               from './rutas/auth.js'
import adminRouter              from './rutas/admin.js'
import agendaRouter             from './rutas/agenda.js'
import ratingsRouter            from './rutas/ratings.js'

const app = express()

// ─── CORS — restringido a los orígenes del frontend ──────────────────────────
const originesPermitidos = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (herramientas REST, server-to-server)
      if (!origin || originesPermitidos.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error(`Origen no permitido por CORS: ${origin}`))
      }
    },
    credentials: true,
  })
)

app.use(express.json())

// ─── Rate limiting global (brute-force / DoS básico) ─────────────────────────
const limiterGlobal = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intentá de nuevo en 15 minutos.' },
})
app.use(limiterGlobal)

// ─── Rate limiting estricto para auth (anti fuerza bruta) ─────────────────────
export const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de acceso. Esperá 15 minutos.' },
})

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/auth',                limiterAuth, authRouter)
app.use('/api/admin',               adminRouter)

// Sedes públicas
app.get('/api/sedes', async (_req, res) => {
  const { data, error } = await supabase.from('sedes').select('id, nombre').order('nombre')
  if (error) return res.status(500).json({ error: 'Error al obtener sedes' })
  res.json({ data: data ?? [] })
})

// Comunicados — últimos 5 para Inicio del socio
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

// Rutas de negocio (la ruta duplicada /juego-libre fue eliminada)
app.use('/api/juego-libre',         juegoLibreRoutes)
app.use('/api/turnos',              turnosRoutes)
app.use('/api/agenda',              agendaRouter)
app.use('/api/ratings',             ratingsRouter)
app.use('/api/clases-particulares', clasesParticularesRoutes)
app.use('/api/perfil',              perfilRouter)
app.use('/api/entrenador',          entrenadorRouter)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT} [${process.env.NODE_ENV || 'development'}]`)
})
