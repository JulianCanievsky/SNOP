import express from 'express'
import bcrypt from 'bcryptjs'
import autenticar from '../src/middlewares/autenticar.js'
import supabase from '../src/config/db.js'

const router = express.Router()

const BCRYPT_ROUNDS = 12

// Middleware: solo admins (tipo_usuario_id = 3)
function soloAdmin(req, res, next) {
  if (req.userTipo !== 3) {
    return res.status(403).json({ error: 'Acceso restringido a administradores' })
  }
  next()
}

router.use(autenticar, soloAdmin)

// ─────────────────────────────────────────────
// STATS — GET /api/admin/stats
// ─────────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  try {
    const [sociosRes, entrenadoresRes, deudaRes] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('tipo_usuario_id', 1).eq('activo', true),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('tipo_usuario_id', 2).eq('activo', true),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('tipo_usuario_id', 1).eq('activo', true).eq('cuota_al_dia', false),
    ])

    // Turnos hoy
    const hoyInicio = new Date(); hoyInicio.setHours(0, 0, 0, 0)
    const hoyFin    = new Date(); hoyFin.setHours(23, 59, 59, 999)
    const { count: turnosHoy } = await supabase
      .from('turnos')
      .select('id', { count: 'exact', head: true })
      .gte('fecha_inicio', hoyInicio.toISOString())
      .lte('fecha_inicio', hoyFin.toISOString())

    res.json({
      data: {
        socios_activos: sociosRes.count ?? 0,
        turnos_hoy:     turnosHoy   ?? 0,
        entrenadores:   entrenadoresRes.count ?? 0,
        con_deuda:      deudaRes.count ?? 0,
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener estadísticas' })
  }
})

// ─────────────────────────────────────────────
// SOCIOS — GET /api/admin/socios
// ─────────────────────────────────────────────
router.get('/socios', async (req, res) => {
  try {
    const { filtro, buscar } = req.query

    let query = supabase
      .from('users')
      .select('id, nombre, email, telefono, nivel_id, cuota_al_dia, activo, tipo_usuario_id, niveles(id, nombre)')
      .eq('tipo_usuario_id', 1)
      .order('nombre', { ascending: true })

    if (filtro === 'activos')    query = query.eq('activo', true)
    if (filtro === 'con_deuda')  query = query.eq('cuota_al_dia', false)
    if (buscar)                  query = query.ilike('nombre', `%${buscar}%`)

    const { data, error } = await query

    if (error) {
      console.error('GET /admin/socios — Supabase error:', JSON.stringify(error))
      throw error
    }

    console.log(`GET /admin/socios → ${data?.length ?? 0} resultados`)
    res.json({ data: data ?? [] })
  } catch (err) {
    console.error('GET /admin/socios — catch:', err)
    res.status(500).json({ error: 'Error al obtener socios' })
  }
})

// ─────────────────────────────────────────────
// SOCIO DETALLE — GET /api/admin/socios/:id
// ─────────────────────────────────────────────
router.get('/socios/:id', async (req, res) => {
  try {
    const { data: usuario, error } = await supabase
      .from('users')
      .select('id, nombre, email, telefono, nivel_id, cuota_al_dia, activo, tipo_usuario_id, fecha_alta, niveles(id, nombre)')
      .eq('id', req.params.id)
      .single()

    if (error || !usuario) return res.status(404).json({ error: 'Socio no encontrado' })

    // Turno asignado
    const { data: turnos } = await supabase
      .from('socio_turno')
      .select('id, estado, turnos(id, fecha_inicio, fecha_fin, sedes(nombre), mesas(numero))')
      .eq('user_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(5)

    res.json({ data: { usuario, turnos: turnos ?? [] } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener socio' })
  }
})

// ─────────────────────────────────────────────
// CREAR SOCIO — POST /api/admin/socios
// ─────────────────────────────────────────────
router.post('/socios', async (req, res) => {
  try {
    const { nombre, email, telefono, nivel_id, password } = req.body

    if (!nombre?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'Nombre y email son requeridos' })
    }

    // Verifica duplicado
    const { data: existente } = await supabase
      .from('users').select('id').eq('email', email.trim().toLowerCase()).maybeSingle()
    if (existente) return res.status(409).json({ error: 'Ya existe un socio con ese email' })

    const rawPassword = password || 'snop1234'
    const hash = await bcrypt.hash(rawPassword, BCRYPT_ROUNDS)

    const { data, error } = await supabase
      .from('users')
      .insert({
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        telefono: telefono?.trim() || null,
        password: hash,
        nivel_id: nivel_id || null,
        tipo_usuario_id: 1,
        activo: true,
        cuota_al_dia: true,
        fecha_alta: new Date().toISOString(),
      })
      .select('id, nombre, email')
      .single()

    if (error) throw error
    res.status(201).json({ data, mensaje: 'Socio creado correctamente' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear socio' })
  }
})

// ─────────────────────────────────────────────
// EDITAR SOCIO — PATCH /api/admin/socios/:id
// ─────────────────────────────────────────────
router.patch('/socios/:id', async (req, res) => {
  try {
    const campos = {}
    const permitidos = ['nombre', 'email', 'telefono', 'nivel_id', 'cuota_al_dia', 'activo']
    for (const k of permitidos) {
      if (req.body[k] !== undefined) campos[k] = req.body[k]
    }

    const { data, error } = await supabase
      .from('users')
      .update(campos)
      .eq('id', req.params.id)
      .select('id, nombre, email, nivel_id, cuota_al_dia')
      .single()

    if (error) throw error
    res.json({ data, mensaje: 'Socio actualizado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar socio' })
  }
})

// ─────────────────────────────────────────────
// ENTRENADORES — GET /api/admin/entrenadores
// ─────────────────────────────────────────────
router.get('/entrenadores', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, nombre')
      .eq('tipo_usuario_id', 2)
      .eq('activo', true)
      .order('nombre')

    if (error) throw error
    res.json({ data: data ?? [] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener entrenadores' })
  }
})

// ─────────────────────────────────────────────
// SEDES — GET /api/admin/sedes
// ─────────────────────────────────────────────
router.get('/sedes', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('sedes').select('id, nombre').order('nombre')
    if (error) throw error
    res.json({ data: data ?? [] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener sedes' })
  }
})

// ─────────────────────────────────────────────
// NIVELES — GET /api/admin/niveles
// ─────────────────────────────────────────────
router.get('/niveles', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('niveles')
      .select('id, nombre, orden')
      .order('orden', { ascending: true })
    if (error) throw error
    res.json({ data: data ?? [] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener niveles' })
  }
})

// ─────────────────────────────────────────────
// NIVELES STATS — GET /api/admin/niveles/stats
// ─────────────────────────────────────────────
router.get('/niveles/stats', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('nivel_id, niveles(nombre)')
      .eq('tipo_usuario_id', 1)
      .eq('activo', true)

    if (error) throw error

    const conteo = {}
    for (const u of data ?? []) {
      const nombre = u.niveles?.nombre ?? 'Sin nivel'
      conteo[nombre] = (conteo[nombre] || 0) + 1
    }

    res.json({ data: conteo })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener stats de niveles' })
  }
})

// ─────────────────────────────────────────────
// COMUNICADOS — POST /api/admin/comunicados
// ─────────────────────────────────────────────
router.post('/comunicados', async (req, res) => {
  try {
    const { titulo, mensaje, destinatarios } = req.body
    if (!titulo?.trim() || !mensaje?.trim()) {
      return res.status(400).json({ error: 'Título y mensaje son requeridos' })
    }

    const { data, error } = await supabase
      .from('comunicados')
      .insert({
        titulo: titulo.trim(),
        mensaje: mensaje.trim(),
        destinatarios: destinatarios || 'todos',
        enviado_por: req.userId,
        fecha: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      // Si la tabla no existe aún, devolvemos éxito igual para no romper el flujo
      if (error.code === '42P01') {
        console.warn('Tabla comunicados no existe aún — comunicado no persistido')
        return res.status(201).json({ data: null, mensaje: 'Comunicado registrado (tabla pendiente de creación)' })
      }
      throw error
    }
    res.status(201).json({ data, mensaje: 'Comunicado enviado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al enviar comunicado' })
  }
})

// ─────────────────────────────────────────────
// COMUNICADOS RECIENTES — GET /api/admin/comunicados
// ─────────────────────────────────────────────
router.get('/comunicados', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('comunicados')
      .select('id, titulo, destinatarios, fecha, mensaje')
      .order('fecha', { ascending: false })
      .limit(10)

    if (error) {
      if (error.code === '42P01') return res.json({ data: [] }) // tabla aún no existe
      throw error
    }
    res.json({ data: data ?? [] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener comunicados' })
  }
})

// ─────────────────────────────────────────────
// CONFIG CLUB — GET /api/admin/config
// ─────────────────────────────────────────────
router.get('/config', async (req, res) => {
  try {
    const { data: adminUser, error: errAdmin } = await supabase
      .from('users')
      .select('id, nombre, email, foto_url')
      .eq('id', req.userId)
      .single()

    if (errAdmin) throw errAdmin

    const { data: club, error: errClub } = await supabase
      .from('clubs')
      .select('id, nombre, whatsapp_link')
      .single()

    // Counts
    const [sedesRes, entresRes, sociosRes] = await Promise.all([
      supabase.from('sedes').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('tipo_usuario_id', 2).eq('activo', true),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('tipo_usuario_id', 1).eq('activo', true),
    ])

    // Sedes list para mostrar nombres
    const { data: sedesList } = await supabase.from('sedes').select('nombre').order('nombre')

    res.json({
      data: {
        admin: adminUser,
        club: errClub ? null : club,
        sedes: sedesList ?? [],
        entrenadores_activos: entresRes.count ?? 0,
        socios_activos:       sociosRes.count ?? 0,
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener configuración' })
  }
})

// ─────────────────────────────────────────────
// JUEGO LIBRE — POST /api/admin/juego-libre
// ─────────────────────────────────────────────
router.post('/juego-libre', async (req, res) => {
  try {
    const { sede_id, fecha, hora_inicio, hora_fin, capacidad_maxima } = req.body

    if (!sede_id || !fecha || !hora_inicio || !hora_fin) {
      return res.status(400).json({ error: 'Sede, fecha, hora inicio y hora fin son requeridos' })
    }

    // Construir timestamps — hora_inicio/hora_fin llegan como "HH:MM"
    const fecha_inicio = new Date(`${fecha}T${hora_inicio}:00`).toISOString()
    const fecha_fin    = new Date(`${fecha}T${hora_fin}:00`).toISOString()

    const { data, error } = await supabase
      .from('juego_libre')
      .insert({
        sede_id,
        fecha_inicio,
        fecha_fin,
        capacidad_maxima: capacidad_maxima || 12,
        activo: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error al crear juego libre:', JSON.stringify(error, null, 2))
      throw error
    }

    res.status(201).json({ data, mensaje: 'Espacio de juego creado' })
  } catch (err) {
    console.error('POST /juego-libre catch:', err)
    res.status(500).json({ error: err.message || 'Error al crear juego libre' })
  }
})

// JUEGO LIBRE PUBLICADOS — GET /api/admin/juego-libre
router.get('/juego-libre', async (_req, res) => {
  try {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    const { data, error } = await supabase
      .from('juego_libre')
      .select('id, fecha_inicio, fecha_fin, capacidad_maxima, sede_id, sedes(nombre)')
      .eq('activo', true)
      .gte('fecha_inicio', hoy.toISOString())
      .order('fecha_inicio', { ascending: true })
      .limit(10)

    if (error) throw error
    res.json({ data: data ?? [] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener juegos libres' })
  }
})

// BORRAR JUEGO LIBRE — DELETE /api/admin/juego-libre/:id
router.delete('/juego-libre/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('juego_libre')
      .update({ activo: false })
      .eq('id', req.params.id)
    if (error) throw error
    res.json({ mensaje: 'Espacio eliminado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar juego libre' })
  }
})

export default router
