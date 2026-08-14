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

import exportarRouter           from './rutas/exportar.js'
import adminTurnosRouter        from './rutas/adminTurnos.js'
import torneosRouter            from './rutas/torneos.js'
import notificacionesRouter     from './rutas/notificaciones.js'
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

// ─── Trust proxy — necesario en Railway/Heroku/Render detrás de un proxy ─────
app.set('trust proxy', 1)

// ─── CORS — restringido a los orígenes del frontend ──────────────────────────
// Lee CORS_ORIGINS del entorno. Puede ser una lista separada por comas.
// Ejemplo en Railway: CORS_ORIGINS=https://snop-psi.vercel.app
const originesPermitidos = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

console.log('[CORS] Orígenes permitidos:', originesPermitidos)

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir requests sin origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true)

    // Permitir cualquier subdominio de vercel.app (previews de Vercel)
    const esVercelPreview = /^https:\/\/[a-z0-9-]+-[a-z0-9]+-[a-z0-9-]+-projects\.vercel\.app$/.test(origin)
      || /^https:\/\/snop[a-z0-9-]*\.vercel\.app$/.test(origin)

    if (originesPermitidos.includes(origin) || esVercelPreview) {
      callback(null, true)
    } else {
      console.warn(`[CORS] Origen bloqueado: ${origin}`)
      callback(null, false)
    }
  },
  credentials: true,
  // Exponer headers necesarios para el cliente
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}

// Aplicar CORS antes de todo — incluyendo el handler explícito de preflight
app.use(cors(corsOptions))
// Responder OK a todas las peticiones OPTIONS (preflight)
app.options('/*', cors(corsOptions))

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
app.use('/api/admin/exportar',      exportarRouter)
app.use('/api/admin/turnos',        adminTurnosRouter)
app.use('/api/torneos',             torneosRouter)
app.use('/api/notificaciones',      notificacionesRouter)

// Sedes públicas
app.get('/api/sedes', async (_req, res) => {
  const { data, error } = await supabase.from('sedes').select('id, nombre').order('nombre')
  if (error) return res.status(500).json({ error: 'Error al obtener sedes' })
  res.json({ data: data ?? [] })
})
// Comunicados — últimos 5 para Inicio del socio (solo los últimos 5 días)
app.get('/api/comunicados', async (_req, res) => {
  try {
    const hace5Dias = new Date()
    hace5Dias.setDate(hace5Dias.getDate() - 5)

    const { data, error } = await supabase
      .from('comunicados')
      .select('id, titulo, mensaje, fecha, destinatarios')
      .in('destinatarios', ['todos', 'con_deuda', 'nivel_rojo', 'nivel_azul'])
      .gte('fecha', hace5Dias.toISOString())
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

// Todos los comunicados para socios (solo los últimos 5 días)
app.get('/api/comunicados/todos', async (_req, res) => {
  try {
    const hace5Dias = new Date()
    hace5Dias.setDate(hace5Dias.getDate() - 5)

    const { data, error } = await supabase
      .from('comunicados')
      .select('id, titulo, mensaje, fecha, destinatarios')
      .in('destinatarios', ['todos', 'con_deuda', 'nivel_rojo', 'nivel_azul'])
      .gte('fecha', hace5Dias.toISOString())
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
