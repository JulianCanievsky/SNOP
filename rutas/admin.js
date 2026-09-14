import express from 'express'
import bcrypt from 'bcryptjs'
import autenticar from '../src/middlewares/autenticar.js'
import supabase from '../src/config/db.js'
import { crearNotificacion, enviarEmail, emailTurnoAsignado, emailSolicitudAceptada, emailSolicitudRechazada, emailTurnoQuitado } from '../src/lib/notificaciones.js'
import { getBonoActivo } from './bonos.js'

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

    // Turnos hoy — usando hora argentina (UTC-3)
    const hoyAR     = new Date().toLocaleString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).slice(0, 10)
    const hoyInicio = new Date(`${hoyAR}T00:00:00-03:00`)
    const hoyFin    = new Date(`${hoyAR}T23:59:59-03:00`)
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

    const dest = destinatarios || 'todos'

    const { data, error } = await supabase
      .from('comunicados')
      .insert({
        titulo:        titulo.trim(),
        mensaje:       mensaje.trim(),
        destinatarios: dest,
        enviado_por:   req.userId,
        fecha:         new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      if (error.code === '42P01') {
        console.warn('Tabla comunicados no existe aún — comunicado no persistido')
        return res.status(201).json({ data: null, mensaje: 'Comunicado registrado (tabla pendiente de creación)' })
      }
      throw error
    }

    // Enviar email + notificación in-app en background (no bloquea la respuesta)
    enviarEmailComunicado({ titulo: titulo.trim(), mensaje: mensaje.trim(), destinatarios: dest })
      .catch(err => console.error('[comunicado] error enviando emails:', err))

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
      .from('clubes')
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
    // Se agrega el offset ART (-03:00) explícitamente para que el valor
    // guardado en UTC sea correcto independientemente del TZ del servidor.
    const fecha_inicio = new Date(`${fecha}T${hora_inicio}:00-03:00`).toISOString()
    const fecha_fin    = new Date(`${fecha}T${hora_fin}:00-03:00`).toISOString()

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
    const hoy = new Date()
    const hoyAR = hoy.toLocaleString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).slice(0, 10)
    const hoyInicioDia = new Date(`${hoyAR}T00:00:00-03:00`)

    const { data, error } = await supabase
      .from('juego_libre')
      .select(`
        id, fecha_inicio, fecha_fin, capacidad_maxima, sede_id, sedes(nombre),
        inscripciones_juego_libre(id, estado)
      `)
      .eq('activo', true)
      .gte('fecha_inicio', hoyInicioDia.toISOString())
      .order('fecha_inicio', { ascending: true })
      .limit(10)

    if (error) throw error

    const resultado = (data ?? []).map(ev => ({
      ...ev,
      _inscriptos: (ev.inscripciones_juego_libre ?? []).filter(i => i.estado === 'activo').length,
    }))

    res.json({ data: resultado })
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

// INSCRIPTOS JUEGO LIBRE — GET /api/admin/juego-libre/:id/inscriptos
router.get('/juego-libre/:id/inscriptos', async (req, res) => {
  try {
    const eventoId = req.params.id

    const { data, error } = await supabase
      .from('inscripciones_juego_libre')
      .select(`
        id,
        fecha_inscripcion,
        estado,
        users!inscripciones_juego_libre_socio_id_fkey (
          id,
          nombre,
          email,
          telefono,
          nivel_id,
          niveles ( nombre )
        )
      `)
      .eq('evento_id', eventoId)
      .eq('estado', 'activo')
      .order('fecha_inscripcion', { ascending: true })

    if (error) throw error

    const inscriptos = (data ?? []).map(i => ({
      id:                i.id,
      nombre:            i.users?.nombre ?? '—',
      email:             i.users?.email  ?? '—',
      telefono:          i.users?.telefono ?? null,
      nivel:             i.users?.niveles?.nombre ?? 'Sin nivel',
      fecha_inscripcion: i.fecha_inscripcion,
    }))

    res.json({ data: inscriptos, total: inscriptos.length })
  } catch (err) {
    console.error('GET /admin/juego-libre/:id/inscriptos', err)
    res.status(500).json({ error: 'Error al obtener inscriptos' })
  }
})

// NOTA: GET /turnos/todos fue movido a rutas/adminTurnos.js para evitar colisión con /:id wildcard.

// ─────────────────────────────────────────────
// INSCRIPTOS TURNO — GET /api/admin/turnos-inscriptos/:turnoId
// ─────────────────────────────────────────────
router.get('/turnos-inscriptos/:turnoId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('socio_turno')
      .select(`
        id, estado, fecha_inscripcion,
        users!socio_turno_user_id_fkey ( id, nombre, email, telefono, nivel_id, niveles(nombre) )
      `)
      .eq('turno_id', req.params.turnoId)
      .eq('estado', true)
      .order('fecha_inscripcion', { ascending: true })

    if (error) throw error

    const inscriptos = (data ?? []).map(i => ({
      id:                i.id,
      nombre:            i.users?.nombre ?? '—',
      email:             i.users?.email  ?? '—',
      telefono:          i.users?.telefono ?? null,
      nivel:             i.users?.niveles?.nombre ?? 'Sin nivel',
      fecha_inscripcion: i.fecha_inscripcion,
    }))

    res.json({ data: inscriptos, total: inscriptos.length })
  } catch (err) {
    console.error('GET /admin/turnos-inscriptos/:turnoId', err)
    res.status(500).json({ error: 'Error al obtener inscriptos del turno' })
  }
})

// NOTA: GET /turnos (disponibles), POST /socios/:id/turnos y DELETE /socios/:id/turnos/:id
// fueron movidos a rutas/adminTurnos.js para evitar colisión con el router montado en /api/admin/turnos.
// Nuevas rutas:
//   GET    /api/admin/turnos/disponibles
//   POST   /api/admin/turnos/asignar/:socioId
//   DELETE /api/admin/turnos/asignar/:socioId/:socioTurnoId

// ─────────────────────────────────────────────
// SOLICITUDES DE INGRESO — GET /api/admin/solicitudes
// Lista solicitudes pendientes del club del admin
// ─────────────────────────────────────────────
router.get('/solicitudes', async (req, res) => {
  try {
    // Obtener club del admin logueado
    const { data: adminUser } = await supabase
      .from('users')
      .select('club_id')
      .eq('id', req.userId)
      .single()

    const clubId = adminUser?.club_id

    let query = supabase
      .from('solicitudes_club')
      .select(`
        id, estado, fecha_solicitud, fecha_resolucion,
        users!solicitudes_club_user_id_fkey ( id, nombre, email, telefono )
      `)
      .order('fecha_solicitud', { ascending: false })

    if (clubId) query = query.eq('club_id', clubId)

    const { data, error } = await query
    if (error) {
      if (error.code === '42P01') return res.json({ data: [] })
      throw error
    }

    res.json({ data: data ?? [] })
  } catch (err) {
    console.error('GET /admin/solicitudes', err)
    res.status(500).json({ error: 'Error al obtener solicitudes' })
  }
})

// ACEPTAR — PATCH /api/admin/solicitudes/:id/aceptar
router.patch('/solicitudes/:id/aceptar', async (req, res) => {
  try {
    const solicitudId = req.params.id
    const adminId     = req.userId

    // Obtener club del admin
    const { data: adminUser } = await supabase
      .from('users')
      .select('club_id')
      .eq('id', adminId)
      .single()

    const { data: sol, error: errSol } = await supabase
      .from('solicitudes_club')
      .select('id, user_id, club_id, estado')
      .eq('id', solicitudId)
      .single()

    if (errSol || !sol) return res.status(404).json({ error: 'Solicitud no encontrada' })
    if (sol.estado !== 'pendiente') return res.status(400).json({ error: 'La solicitud ya fue resuelta' })

    const clubId = sol.club_id ?? adminUser?.club_id

    // Activar cuenta: estado_cuenta = 'activa', asignar club_id
    await supabase
      .from('users')
      .update({ estado_cuenta: 'activa', club_id: clubId })
      .eq('id', sol.user_id)

    // Actualizar solicitud
    await supabase
      .from('solicitudes_club')
      .update({
        estado:           'aceptada',
        fecha_resolucion: new Date().toISOString(),
        resuelto_por:     adminId,
      })
      .eq('id', solicitudId)

    // Notificación + email al socio
    try {
      const { data: socioData } = await supabase
        .from('users').select('nombre, email').eq('id', sol.user_id).single()
      const { data: clubData }  = await supabase
        .from('clubes').select('nombre').eq('id', clubId).maybeSingle()

      if (socioData) {
        const clubNombre = clubData?.nombre ?? 'el club'
        await crearNotificacion({
          user_id: sol.user_id,
          titulo:  '¡Solicitud aprobada!',
          mensaje: `Ya sos parte de ${clubNombre}. Ya podés iniciar sesión.`,
          tipo:    'solicitud_club',
          link:    '/inicio',
        })
        const tmpl = emailSolicitudAceptada({ nombre: socioData.nombre, clubNombre })
        await enviarEmail({ to: socioData.email, ...tmpl })
      }
    } catch (notifErr) {
      console.error('Notif solicitud aceptada:', notifErr)
    }

    res.json({ mensaje: 'Solicitud aceptada. El socio ya puede iniciar sesión.' })
  } catch (err) {
    console.error('PATCH /admin/solicitudes/:id/aceptar', err)
    res.status(500).json({ error: 'Error al aceptar solicitud' })
  }
})

// RECHAZAR — PATCH /api/admin/solicitudes/:id/rechazar
router.patch('/solicitudes/:id/rechazar', async (req, res) => {
  try {
    const solicitudId = req.params.id
    const adminId     = req.userId

    const { data: sol, error: errSol } = await supabase
      .from('solicitudes_club')
      .select('id, user_id, estado')
      .eq('id', solicitudId)
      .single()

    if (errSol || !sol) return res.status(404).json({ error: 'Solicitud no encontrada' })
    if (sol.estado !== 'pendiente') return res.status(400).json({ error: 'La solicitud ya fue resuelta' })

    await supabase
      .from('solicitudes_club')
      .update({
        estado:           'rechazada',
        fecha_resolucion: new Date().toISOString(),
        resuelto_por:     adminId,
      })
      .eq('id', solicitudId)

    // Notificación + email al socio
    try {
      const { data: socioData } = await supabase
        .from('users').select('nombre, email').eq('id', sol.user_id).single()
      const { data: solData }   = await supabase
        .from('solicitudes_club').select('club_id').eq('id', solicitudId).single()
      const { data: clubData }  = await supabase
        .from('clubes').select('nombre').eq('id', solData?.club_id).maybeSingle()

      if (socioData) {
        const clubNombre = clubData?.nombre ?? 'el club'
        await crearNotificacion({
          user_id: sol.user_id,
          titulo:  'Solicitud no aprobada',
          mensaje: `Tu solicitud para unirte a ${clubNombre} no fue aprobada.`,
          tipo:    'solicitud_club',
        })
        const tmpl = emailSolicitudRechazada({ nombre: socioData.nombre, clubNombre })
        await enviarEmail({ to: socioData.email, ...tmpl })
      }
    } catch (notifErr) {
      console.error('Notif solicitud rechazada:', notifErr)
    }

    res.json({ mensaje: 'Solicitud rechazada.' })
  } catch (err) {
    console.error('PATCH /admin/solicitudes/:id/rechazar', err)
    res.status(500).json({ error: 'Error al rechazar solicitud' })
  }
})

// ─────────────────────────────────────────────
// TORNEOS — POST /api/admin/torneos
// ─────────────────────────────────────────────
router.post('/torneos', async (req, res) => {
  try {
    const { nombre, sede_id, fecha, hora_inicio, hora_fin, modalidad, capacidad_maxima, niveles_habilitados } = req.body

    if (!nombre?.trim() || !sede_id || !fecha || !hora_inicio || !hora_fin || !modalidad) {
      return res.status(400).json({ error: 'Nombre, sede, fecha, horario y modalidad son requeridos' })
    }

    const fecha_inicio = new Date(`${fecha}T${hora_inicio}:00-03:00`).toISOString()
    const fecha_fin    = new Date(`${fecha}T${hora_fin}:00-03:00`).toISOString()

    const { data, error } = await supabase
      .from('torneos')
      .insert({
        nombre: nombre.trim(),
        sede_id,
        fecha_inicio,
        fecha_fin,
        modalidad,
        capacidad_maxima: capacidad_maxima || 16,
        niveles_habilitados: niveles_habilitados ?? [],
        activo: true,
        creado_por: req.userId,
      })
      .select('*, sedes(nombre)')
      .single()

    if (error) throw error
    res.status(201).json({ data, mensaje: 'Torneo creado correctamente' })
  } catch (err) {
    console.error('POST /admin/torneos', err)
    res.status(500).json({ error: err.message || 'Error al crear torneo' })
  }
})

// GET /api/admin/torneos
router.get('/torneos', async (_req, res) => {
  try {
    const hoyAR2 = new Date().toLocaleString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).slice(0, 10)
    const hoy = new Date(`${hoyAR2}T00:00:00-03:00`)

    const { data, error } = await supabase
      .from('torneos')
      .select(`
        id, nombre, fecha_inicio, fecha_fin, modalidad, capacidad_maxima,
        niveles_habilitados, activo,
        sedes(nombre),
        inscripciones_torneo(id, estado)
      `)
      .eq('activo', true)
      .gte('fecha_inicio', hoy.toISOString())
      .order('fecha_inicio', { ascending: true })

    if (error) {
      if (error.code === '42P01') return res.json({ data: [] })
      throw error
    }

    const resultado = (data ?? []).map(t => ({
      ...t,
      inscriptos: (t.inscripciones_torneo ?? []).filter(i => i.estado === 'activo').length,
    }))

    res.json({ data: resultado })
  } catch (err) {
    console.error('GET /admin/torneos', err)
    res.status(500).json({ error: 'Error al obtener torneos' })
  }
})

// GET /api/admin/torneos/:id/inscriptos
router.get('/torneos/:id/inscriptos', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('inscripciones_torneo')
      .select(`
        id, fecha_inscripcion, estado,
        users!inscripciones_torneo_socio_id_fkey(id, nombre, email, telefono, nivel_id, niveles(nombre))
      `)
      .eq('torneo_id', req.params.id)
      .eq('estado', 'activo')
      .order('fecha_inscripcion', { ascending: true })

    if (error) throw error

    const inscriptos = (data ?? []).map(i => ({
      id:                i.id,
      socio_id:          i.users?.id ?? null,
      nombre:            i.users?.nombre ?? '—',
      email:             i.users?.email  ?? '—',
      telefono:          i.users?.telefono ?? null,
      nivel:             i.users?.niveles?.nombre ?? 'Sin nivel',
      fecha_inscripcion: i.fecha_inscripcion,
    }))

    res.json({ data: inscriptos, total: inscriptos.length })
  } catch (err) {
    console.error('GET /admin/torneos/:id/inscriptos', err)
    res.status(500).json({ error: 'Error al obtener inscriptos' })
  }
})

// DELETE /api/admin/torneos/:id/inscriptos/:socioId — quitar socio de un torneo
router.delete('/torneos/:id/inscriptos/:socioId', async (req, res) => {
  const { id: torneoId, socioId } = req.params
  try {
    const { error } = await supabase
      .from('inscripciones_torneo')
      .update({ estado: 'cancelado' })
      .eq('torneo_id', torneoId)
      .eq('socio_id', socioId)
      .eq('estado', 'activo')

    if (error) throw error

    // Notificar al socio
    try {
      const { data: socioData } = await supabase
        .from('users').select('nombre, email').eq('id', socioId).single()
      const { data: torneoData } = await supabase
        .from('torneos').select('nombre').eq('id', torneoId).single()

      if (socioData && torneoData) {
        await crearNotificacion({
          user_id: socioId,
          titulo:  'Baja de torneo',
          mensaje: `Fuiste dado/a de baja del torneo "${torneoData.nombre}".`,
          tipo:    'torneo_baja',
          link:    '/torneos',
        })
        await enviarEmail({
          to:      socioData.email,
          subject: `Baja del torneo "${torneoData.nombre}" — SNOP`,
          html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8f9fc;border-radius:12px;">
            <h2 style="color:#dc2626;margin:0 0 8px;">Baja de torneo</h2>
            <p style="color:#555;">Hola <strong>${socioData.nombre}</strong>, el administrador te dio de baja del torneo <strong>${torneoData.nombre}</strong>.</p>
            <p style="color:#555;font-size:14px;">Si creés que es un error, comunicate con el club.</p>
          </div>`,
        })
      }
    } catch (notifErr) {
      console.error('[admin/torneos] notif baja inscripto:', notifErr)
    }

    res.json({ mensaje: 'Inscripción cancelada correctamente' })
  } catch (err) {
    console.error('DELETE /admin/torneos/:id/inscriptos/:socioId', err)
    res.status(500).json({ error: 'Error al quitar inscripto del torneo' })
  }
})

// DELETE /api/admin/torneos/:id
router.delete('/torneos/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('torneos')
      .update({ activo: false })
      .eq('id', req.params.id)
    if (error) throw error
    res.json({ mensaje: 'Torneo eliminado' })
  } catch (err) {
    console.error('DELETE /admin/torneos', err)
    res.status(500).json({ error: 'Error al eliminar torneo' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Helper: enviar email + notificación in-app a los destinatarios de un comunicado
// ─────────────────────────────────────────────────────────────────────────────
async function enviarEmailComunicado({ titulo, mensaje, destinatarios }) {
  // Construir filtro de usuarios según segmento
  let query = supabase
    .from('users')
    .select('id, nombre, email, tipo_usuario_id, cuota_al_dia, nivel_id, niveles(nombre)')
    .eq('activo', true)
    .not('email', 'is', null)

  if (destinatarios === 'todos') {
    query = query.eq('tipo_usuario_id', 1).eq('estado_cuenta', 'activa')
  } else if (destinatarios === 'entrenadores') {
    query = query.eq('tipo_usuario_id', 2)
  } else if (destinatarios === 'con_deuda') {
    query = query.eq('tipo_usuario_id', 1).eq('cuota_al_dia', false).eq('estado_cuenta', 'activa')
  } else if (destinatarios === 'nivel_rojo') {
    const { data: nivel } = await supabase
      .from('niveles').select('id').ilike('nombre', '%rojo%').maybeSingle()
    if (!nivel) return
    query = query.eq('tipo_usuario_id', 1).eq('nivel_id', nivel.id).eq('estado_cuenta', 'activa')
  } else if (destinatarios === 'nivel_azul') {
    const { data: nivel } = await supabase
      .from('niveles').select('id').ilike('nombre', '%azul%').maybeSingle()
    if (!nivel) return
    query = query.eq('tipo_usuario_id', 1).eq('nivel_id', nivel.id).eq('estado_cuenta', 'activa')
  }

  const { data: usuarios, error } = await query
  if (error) { console.error('[comunicado] error al obtener usuarios:', error); return }
  if (!usuarios?.length) return

  const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://snop-psi.vercel.app').replace(/\/$/, '')

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f8f9fc;border-radius:12px;overflow:hidden;">
      <div style="background:#2563eb;padding:24px 28px;">
        <p style="color:rgba(255,255,255,0.75);margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Comunicado — SNOP Club</p>
        <h2 style="color:#fff;margin:0;font-size:20px;line-height:1.3;">${titulo}</h2>
      </div>
      <div style="padding:28px;">
        <p style="color:#374151;line-height:1.7;white-space:pre-line;margin:0 0 24px;font-size:15px;">${mensaje}</p>
        <a href="${FRONTEND_URL}/comunicados"
           style="display:inline-block;padding:13px 26px;background:#2563eb;color:#fff;border-radius:28px;text-decoration:none;font-weight:700;font-size:14px;">
          Ver todos los comunicados
        </a>
        <p style="color:#9ca3af;font-size:11px;margin-top:24px;line-height:1.5;">
          Recibís este email porque sos parte de SNOP Club.<br>
          Para dejar de recibirlos, contactá al administrador del club.
        </p>
      </div>
    </div>
  `

  // Enviar en serie para no saturar Brevo (300 emails/día plan free)
  let enviados = 0
  for (const u of usuarios) {
    try {
      await crearNotificacion({
        user_id: u.id,
        titulo,
        mensaje,
        tipo:   'comunicado',
        link:   '/comunicados',
      })
      await enviarEmail({ to: u.email, subject: `${titulo} — SNOP`, html })
      enviados++
    } catch (err) {
      console.error(`[comunicado] error con usuario ${u.email}:`, err?.message)
    }
  }

  console.log(`[comunicado] Enviado a ${enviados}/${usuarios.length} usuario(s) — segmento: ${destinatarios}`)
}

export default router
