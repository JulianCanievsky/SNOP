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
import autenticar               from './src/middlewares/autenticar.js'
import entrenadorRouter         from './rutas/entrenador.js'
import authRouter               from './rutas/auth.js'
import adminRouter              from './rutas/admin.js'
import agendaRouter             from './rutas/agenda.js'
import ratingsRouter            from './rutas/ratings.js'
import bonosRouter              from './rutas/bonos.js'

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
// IMPORTANTE: los routers más específicos van ANTES del router genérico de admin,
// de lo contrario Express captura /api/admin/exportar y /api/admin/turnos con adminRouter.
app.use('/api/auth',                limiterAuth, authRouter)
app.use('/api/admin/exportar',      exportarRouter)
app.use('/api/admin/turnos',        adminTurnosRouter)
app.use('/api/admin',               adminRouter)
app.use('/api/torneos',             torneosRouter)
app.use('/api/notificaciones',      notificacionesRouter)

// Sedes públicas
app.get('/api/sedes', async (_req, res) => {
  const { data, error } = await supabase.from('sedes').select('id, nombre').order('nombre')
  if (error) return res.status(500).json({ ok: false, mensaje: 'Error al obtener sedes' })
  res.json({ ok: true, data: data ?? [] })
})

// Niveles/categorías — accesible para cualquier usuario autenticado
app.get('/api/niveles', autenticar, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('niveles')
      .select('id, nombre, orden')
      .order('orden', { ascending: true })
    if (error) throw error
    res.json({ ok: true, data: data ?? [] })
  } catch (err) {
    console.error('GET /api/niveles', err)
    res.status(500).json({ ok: false, mensaje: 'Error al obtener niveles' })
  }
})
// Comunicados — últimos 5 para Inicio del socio (solo los últimos 5 días)
app.get('/api/comunicados', autenticar, async (req, res) => {
  try {
    const hace5Dias = new Date()
    hace5Dias.setDate(hace5Dias.getDate() - 5)

    // Traer comunicados globales ('todos') más los del nivel del socio ('nivel_<id>')
    // El socio ve: 'todos', 'con_deuda', y su propio 'nivel_<id>'
    const nivelId = req.user?.nivel_id ?? null
    const filtros = ['todos', 'con_deuda', 'entrenadores']
    if (nivelId) filtros.push(`nivel_${nivelId}`)

    const { data, error } = await supabase
      .from('comunicados')
      .select('id, titulo, mensaje, fecha, destinatarios')
      .in('destinatarios', filtros)
      .gte('fecha', hace5Dias.toISOString())
      .order('fecha', { ascending: false })
      .limit(5)
    if (error) {
      if (error.code === '42P01') return res.json({ ok: true, data: [] })
      throw error
    }
    res.json({ ok: true, data: data ?? [] })
  } catch (err) {
    console.error('GET /api/comunicados', err)
    res.status(500).json({ ok: false, mensaje: 'Error al obtener comunicados' })
  }
})

// Todos los comunicados para socios (pantalla completa de Comunicados)
app.get('/api/comunicados/todos', autenticar, async (req, res) => {
  try {
    const nivelId = req.user?.nivel_id ?? null
    const filtros = ['todos', 'con_deuda', 'entrenadores']
    if (nivelId) filtros.push(`nivel_${nivelId}`)

    const { data, error } = await supabase
      .from('comunicados')
      .select('id, titulo, mensaje, fecha, destinatarios')
      .in('destinatarios', filtros)
      .order('fecha', { ascending: false })
    if (error) {
      if (error.code === '42P01') return res.json({ ok: true, data: [] })
      throw error
    }
    res.json({ ok: true, data: data ?? [] })
  } catch (err) {
    console.error('GET /api/comunicados/todos', err)
    res.status(500).json({ ok: false, mensaje: 'Error al obtener comunicados' })
  }
})

// Rutas de negocio (la ruta duplicada /juego-libre fue eliminada)
app.use('/api/juego-libre',         juegoLibreRoutes)
app.use('/api/turnos',              turnosRoutes)
app.use('/api/agenda',              agendaRouter)
app.use('/api/ratings',             ratingsRouter)
app.use('/api/bonos',               bonosRouter)
app.use('/api/clases-particulares', clasesParticularesRoutes)
app.use('/api/perfil',              perfilRouter)
app.use('/api/entrenador',          entrenadorRouter)

// ── Créditos de recupero ──────────────────────────────────────────────────────
// GET /api/creditos — resumen de créditos del socio autenticado
app.get('/api/creditos', autenticar, async (req, res) => {
  const socioId = req.userId
  const ahora   = new Date()
  try {
    const { data, error } = await supabase
      .from('creditos_clase')
      .select('id, mes_periodo, usado, turno_origen_id, turno_usado_id, fecha_generado, fecha_vencimiento')
      .eq('user_id', socioId)
      .order('fecha_vencimiento', { ascending: true })

    if (error) {
      if (error.code === '42P01') return res.json({ ok: true, data: { disponibles: 0, usados: 0, vencidos: 0, creditos: [] } })
      throw error
    }

    const creditos = (data ?? []).map(c => ({
      ...c,
      vencido: !c.usado && new Date(c.fecha_vencimiento) < ahora,
    }))

    const disponibles = creditos.filter(c => !c.usado && !c.vencido).length
    const usados      = creditos.filter(c =>  c.usado).length
    const vencidos    = creditos.filter(c =>  c.vencido).length

    // Marcar vencidos en la DB (proceso al consultar)
    const idsVencidos = creditos.filter(c => c.vencido).map(c => c.id)
    if (idsVencidos.length > 0) {
      // No bloqueamos la respuesta — lo hacemos en background
      supabase.from('creditos_clase')
        .update({ usado: true })
        .in('id', idsVencidos)
        .then(() => {})
        .catch(err => console.error('[creditos] error marcando vencidos:', err))
    }

    res.json({ ok: true, data: { disponibles, usados, vencidos, creditos } })
  } catch (err) {
    console.error('GET /api/creditos', err)
    res.status(500).json({ ok: false, mensaje: 'Error al obtener créditos' })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT} [${process.env.NODE_ENV || 'development'}]`)
})
