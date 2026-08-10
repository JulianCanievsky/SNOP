import express from 'express'
import autenticar from '../src/middlewares/autenticar.js'
import supabase from '../src/config/db.js'
import { crearNotificacion, enviarEmail, emailClaseConfirmada, emailClaseRechazada } from '../src/lib/notificaciones.js'

const router = express.Router()

// Todas las rutas requieren autenticación
router.use(autenticar)

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function inicioDelDia() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function finDelDia() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

// ─── GET /resumen-hoy ─────────────────────────────────────────────────────────
// Clases que tiene el entrenador hoy + solicitudes pendientes (estado=false)
router.get('/resumen-hoy', async (req, res) => {
  try {
    const entrenadorId = req.userId

    const { data: clasesHoy, error } = await supabase
      .from('turnos')
      .select('id, fecha_inicio, fecha_fin, estado')
      .eq('user_id', entrenadorId)
      .gte('fecha_inicio', inicioDelDia())
      .lte('fecha_inicio', finDelDia())
      .order('fecha_inicio', { ascending: true })

    if (error) throw error

    const ahora = new Date().toISOString()
    const quedan = (clasesHoy || []).filter((c) => c.fecha_inicio > ahora).length

    // Turnos particulares del entrenador
    const { data: turnosPart } = await supabase
      .from('turnos')
      .select('id')
      .eq('user_id', entrenadorId)
      .eq('tipo_turno_id', 2)

    const turnoIds = (turnosPart || []).map((t) => t.id)

    let pendientes = 0
    if (turnoIds.length > 0) {
      // estado = false → pendiente de confirmación
      const { count } = await supabase
        .from('socio_turno')
        .select('id', { count: 'exact', head: true })
        .in('turno_id', turnoIds)
        .eq('estado', false)

      pendientes = count || 0
    }

    res.json({
      data: {
        clases_hoy: clasesHoy?.length || 0,
        clases_quedan: quedan,
        turnos_pendientes: pendientes,
      },
    })
  } catch (err) {
    console.error('GET /resumen-hoy', err)
    res.status(500).json({ error: 'Error al obtener resumen del día' })
  }
})

// ─── GET /mis-clases ──────────────────────────────────────────────────────────
// Clases del entrenador en los próximos 7 días
router.get('/mis-clases', async (req, res) => {
  try {
    const entrenadorId = req.userId

    const desde = new Date()
    desde.setHours(0, 0, 0, 0)
    const hasta = new Date(desde)
    hasta.setDate(hasta.getDate() + 7)

    const { data: turnos, error } = await supabase
      .from('turnos')
      .select(`
        id,
        fecha_inicio,
        fecha_fin,
        duracion_min,
        estado,
        capacidad_maxima,
        tipo_turno_id,
        tipo_turno ( nombre ),
        nivel_minimo_id,
        nivel_maximo_id,
        niveles_min:niveles!turnos_nivel_minimo_id_fkey ( id, nombre ),
        sede_id,
        sedes ( nombre ),
        mesa_id,
        mesas ( numero ),
        socio_turno ( id, estado, user_id )
      `)
      .eq('user_id', entrenadorId)
      .gte('fecha_inicio', desde.toISOString())
      .lt('fecha_inicio', hasta.toISOString())
      .order('fecha_inicio', { ascending: true })

    if (error) throw error

    res.json({ data: turnos || [] })
  } catch (err) {
    console.error('GET /mis-clases', err)
    res.status(500).json({ error: 'Error al obtener clases' })
  }
})

// ─── PATCH /clases/:turnoId/cancelar ─────────────────────────────────────────
router.patch('/clases/:turnoId/cancelar', async (req, res) => {
  try {
    const entrenadorId = req.userId
    const { turnoId } = req.params

    const { data: turno, error: errVerif } = await supabase
      .from('turnos')
      .select('id, user_id')
      .eq('id', turnoId)
      .eq('user_id', entrenadorId)
      .single()

    if (errVerif || !turno) {
      return res.status(403).json({ error: 'Turno no encontrado o sin permiso' })
    }

    const { error } = await supabase
      .from('turnos')
      .update({ estado: false })
      .eq('id', turnoId)

    if (error) throw error

    res.json({ message: 'Turno cancelado' })
  } catch (err) {
    console.error('PATCH /clases/:id/cancelar', err)
    res.status(500).json({ error: 'Error al cancelar turno' })
  }
})

// ─── GET /mis-alumnos ─────────────────────────────────────────────────────────
// Alumnos confirmados (estado=true) en turnos de este entrenador
router.get('/mis-alumnos', async (req, res) => {
  try {
    const entrenadorId = req.userId

    const { data: turnosEntrenador, error: errTurnos } = await supabase
      .from('turnos')
      .select('id, fecha_inicio, sede_id, sedes ( nombre )')
      .eq('user_id', entrenadorId)

    if (errTurnos) throw errTurnos

    const turnoIds = (turnosEntrenador || []).map((t) => t.id)

    if (turnoIds.length === 0) {
      return res.json({ data: [] })
    }

    // estado=true → confirmados
    const { data: inscripciones, error: errInsc } = await supabase
      .from('socio_turno')
      .select(`
        id,
        turno_id,
        estado,
        users (
          id,
          nombre,
          email,
          foto_url,
          nivel_id,
          niveles ( id, nombre, orden )
        )
      `)
      .in('turno_id', turnoIds)
      .eq('estado', true)

    if (errInsc) throw errInsc

    // Agrupar por alumno
    const alumnosMap = new Map()

    for (const insc of inscripciones || []) {
      const u = insc.users
      if (!u) continue

      const turno = turnosEntrenador.find((t) => t.id === insc.turno_id)

      if (!alumnosMap.has(u.id)) {
        alumnosMap.set(u.id, {
          id: u.id,
          nombre: u.nombre,
          email: u.email,
          foto_url: u.foto_url,
          nivel_id: u.nivel_id,
          nivel: u.niveles,
          turnos: [],
        })
      }

      if (turno) {
        alumnosMap.get(u.id).turnos.push({
          turno_id: insc.turno_id,
          fecha_inicio: turno.fecha_inicio,
          sede: turno.sedes?.nombre,
        })
      }
    }

    res.json({ data: Array.from(alumnosMap.values()) })
  } catch (err) {
    console.error('GET /mis-alumnos', err)
    res.status(500).json({ error: 'Error al obtener alumnos' })
  }
})

// ─── GET /alumnos/:alumnoId ───────────────────────────────────────────────────
router.get('/alumnos/:alumnoId', async (req, res) => {
  try {
    const entrenadorId = req.userId
    const { alumnoId } = req.params

    const { data: turnosEntrenador } = await supabase
      .from('turnos')
      .select('id, fecha_inicio, sede_id, sedes ( nombre )')
      .eq('user_id', entrenadorId)

    const turnoIds = (turnosEntrenador || []).map((t) => t.id)

    // Verificar que el alumno tiene un turno confirmado con este entrenador
    const { data: insc } = await supabase
      .from('socio_turno')
      .select('turno_id')
      .eq('user_id', alumnoId)
      .in('turno_id', turnoIds)
      .eq('estado', true)

    if (!insc || insc.length === 0) {
      return res.status(403).json({ error: 'Alumno no asignado a este entrenador' })
    }

    const { data: alumno, error } = await supabase
      .from('users')
      .select('id, nombre, email, foto_url, nivel_id, niveles ( id, nombre, orden )')
      .eq('id', alumnoId)
      .single()

    if (error || !alumno) throw error || new Error('No encontrado')

    const turnoIds2 = insc.map((i) => i.turno_id)
    const turnosAlumno = (turnosEntrenador || [])
      .filter((t) => turnoIds2.includes(t.id))
      .map((t) => ({
        turno_id: t.id,
        fecha_inicio: t.fecha_inicio,
        sede: t.sedes?.nombre,
      }))

    res.json({ data: { ...alumno, turnos: turnosAlumno } })
  } catch (err) {
    console.error('GET /alumnos/:id', err)
    res.status(500).json({ error: 'Error al obtener alumno' })
  }
})

// ─── PATCH /alumnos/:alumnoId/nivel ──────────────────────────────────────────
router.patch('/alumnos/:alumnoId/nivel', async (req, res) => {
  try {
    const entrenadorId = req.userId
    const { alumnoId } = req.params
    const { nivel_id } = req.body

    if (!nivel_id) {
      return res.status(400).json({ error: 'nivel_id requerido' })
    }

    const { data: turnosEntrenador } = await supabase
      .from('turnos')
      .select('id')
      .eq('user_id', entrenadorId)

    const turnoIds = (turnosEntrenador || []).map((t) => t.id)

    const { data: insc } = await supabase
      .from('socio_turno')
      .select('id')
      .eq('user_id', alumnoId)
      .in('turno_id', turnoIds)
      .eq('estado', true)
      .limit(1)

    if (!insc || insc.length === 0) {
      return res.status(403).json({ error: 'Sin permiso para editar este alumno' })
    }

    const { error } = await supabase
      .from('users')
      .update({ nivel_id })
      .eq('id', alumnoId)

    if (error) throw error

    res.json({ message: 'Nivel actualizado' })
  } catch (err) {
    console.error('PATCH /alumnos/:id/nivel', err)
    res.status(500).json({ error: 'Error al actualizar nivel' })
  }
})

// ─── GET /mis-horarios ────────────────────────────────────────────────────────
router.get('/mis-horarios', async (req, res) => {
  try {
    const entrenadorId = req.userId

    const desde = new Date()
    desde.setHours(0, 0, 0, 0)

    const { data: turnos, error } = await supabase
      .from('turnos')
      .select(`
        id,
        fecha_inicio,
        fecha_fin,
        estado,
        tipo_turno_id,
        sede_id,
        sedes ( nombre ),
        socio_turno ( id, estado )
      `)
      .eq('user_id', entrenadorId)
      .eq('tipo_turno_id', 2)
      .gte('fecha_inicio', desde.toISOString())
      .order('fecha_inicio', { ascending: true })

    if (error) throw error

    res.json({ data: turnos || [] })
  } catch (err) {
    console.error('GET /mis-horarios', err)
    res.status(500).json({ error: 'Error al obtener horarios' })
  }
})

// ─── GET /sedes ───────────────────────────────────────────────────────────────
router.get('/sedes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sedes')
      .select('id, nombre, direccion')
      .eq('activo', true)
      .order('nombre')

    if (error) throw error
    res.json({ data: data || [] })
  } catch (err) {
    console.error('GET /sedes', err)
    res.status(500).json({ error: 'Error al obtener sedes' })
  }
})

// ─── POST /mis-horarios ───────────────────────────────────────────────────────
router.post('/mis-horarios', async (req, res) => {
  try {
    const entrenadorId = req.userId
    const { dia, hora, sede_id, duracion_min } = req.body

    if (!dia || !hora || !sede_id) {
      return res.status(400).json({ error: 'dia, hora y sede_id son requeridos' })
    }

    // Validar duración — default 60 min si no se envía
    const durMin = Number(duracion_min)
    const duracionFinal = [30, 45, 60, 90, 120].includes(durMin) ? durMin : 60

    const DIAS = {
      lunes: 1, martes: 2, miercoles: 3, miércoles: 3,
      jueves: 4, viernes: 5, sabado: 6, sábado: 6, domingo: 0,
    }
    const diaNum = DIAS[dia.toLowerCase()]
    if (diaNum === undefined) {
      return res.status(400).json({ error: 'Día inválido' })
    }

    const hoy = new Date()
    const diff = (diaNum - hoy.getDay() + 7) % 7 || 7
    const fechaBase = new Date(hoy)
    fechaBase.setDate(hoy.getDate() + diff)

    const [hh, mm] = hora.split(':').map(Number)
    fechaBase.setHours(hh, mm, 0, 0)
    const fechaFin = new Date(fechaBase.getTime() + duracionFinal * 60 * 1000)

    // Buscar una mesa disponible en la sede (mesa_id es NOT NULL en la tabla)
    const { data: mesas } = await supabase
      .from('mesas')
      .select('id')
      .eq('sede_id', Number(sede_id))
      .eq('activa', true)
      .limit(1)

    const mesaId = mesas?.[0]?.id ?? null
    if (!mesaId) {
      return res.status(400).json({ error: 'No hay mesas disponibles en esta sede' })
    }

    const { data, error } = await supabase
      .from('turnos')
      .insert({
        user_id: entrenadorId,
        tipo_turno_id: 2,
        sede_id: Number(sede_id),
        mesa_id: mesaId,
        fecha_inicio: fechaBase.toISOString(),
        fecha_fin: fechaFin.toISOString(),
        duracion_min: duracionFinal,
        estado: true,
        capacidad_maxima: 2,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error POST /mis-horarios:', JSON.stringify(error))
      return res.status(500).json({ error: error.message || 'Error al agregar horario' })
    }

    res.status(201).json({ data })
  } catch (err) {
    console.error('POST /mis-horarios catch:', err)
    res.status(500).json({ error: err.message || 'Error al agregar horario' })
  }
})

// ─── DELETE /mis-horarios/:turnoId ───────────────────────────────────────────
router.delete('/mis-horarios/:turnoId', async (req, res) => {
  try {
    const entrenadorId = req.userId
    const { turnoId } = req.params

    // Verificar que el turno le pertenece al entrenador y es tipo_turno_id=2
    const { data: turno, error: errVerif } = await supabase
      .from('turnos')
      .select('id, user_id, tipo_turno_id')
      .eq('id', turnoId)
      .eq('user_id', entrenadorId)
      .eq('tipo_turno_id', 2)
      .single()

    if (errVerif || !turno) {
      return res.status(403).json({ error: 'Turno no encontrado o sin permiso' })
    }

    // Eliminar inscripciones asociadas primero
    await supabase.from('socio_turno').delete().eq('turno_id', turnoId)

    // Eliminar el turno
    const { error } = await supabase.from('turnos').delete().eq('id', turnoId)
    if (error) throw error

    res.json({ message: 'Horario cancelado' })
  } catch (err) {
    console.error('DELETE /mis-horarios/:id', err)
    res.status(500).json({ error: 'Error al cancelar horario' })
  }
})

// ─── GET /solicitudes ─────────────────────────────────────────────────────────
// estado=false → pendiente de confirmar por el entrenador
// estado=true  → ya confirmada
router.get('/solicitudes', async (req, res) => {
  try {
    const entrenadorId = req.userId

    const { data: turnosParticulares, error: errT } = await supabase
      .from('turnos')
      .select('id, fecha_inicio, fecha_fin, sede_id, sedes ( nombre )')
      .eq('user_id', entrenadorId)
      .eq('tipo_turno_id', 2)

    if (errT) throw errT

    const turnoIds = (turnosParticulares || []).map((t) => t.id)

    if (turnoIds.length === 0) {
      return res.json({ data: [] })
    }

    const { data: solicitudes, error } = await supabase
      .from('socio_turno')
      .select(`
        id,
        turno_id,
        estado,
        fecha_inscripcion,
        users (
          id,
          nombre,
          email,
          foto_url,
          nivel_id,
          niveles ( id, nombre )
        )
      `)
      .in('turno_id', turnoIds)
      .order('fecha_inscripcion', { ascending: false })

    if (error) throw error

    // Combinar con datos del turno y normalizar estado:
    // estado=false → 'pendiente', estado=true → 'confirmado'
    const result = (solicitudes || []).map((s) => {
      const turno = turnosParticulares.find((t) => t.id === s.turno_id)
      return {
        ...s,
        estado: s.estado === true ? 'confirmado' : 'pendiente',
        turno: turno
          ? {
              id: turno.id,
              fecha_inicio: turno.fecha_inicio,
              fecha_fin: turno.fecha_fin,
              sede: turno.sedes?.nombre,
            }
          : null,
      }
    })

    res.json({ data: result })
  } catch (err) {
    console.error('GET /solicitudes', err)
    res.status(500).json({ error: 'Error al obtener solicitudes' })
  }
})

// ─── PATCH /solicitudes/:id/confirmar ────────────────────────────────────────
// Confirmar = poner estado=true
router.patch('/solicitudes/:solicitudId/confirmar', async (req, res) => {
  try {
    const entrenadorId = req.userId
    const { solicitudId } = req.params

    const { data: sol, error: errSol } = await supabase
      .from('socio_turno')
      .select('id, turno_id')
      .eq('id', solicitudId)
      .single()

    if (errSol || !sol) {
      return res.status(404).json({ error: 'Solicitud no encontrada' })
    }

    const { data: turno } = await supabase
      .from('turnos')
      .select('user_id')
      .eq('id', sol.turno_id)
      .single()

    if (!turno || turno.user_id !== entrenadorId) {
      return res.status(403).json({ error: 'Sin permiso' })
    }

    const { error } = await supabase
      .from('socio_turno')
      .update({ estado: true })
      .eq('id', solicitudId)

    if (error) throw error

    // Notificación + email al socio
    try {
      const { data: solConDatos } = await supabase
        .from('socio_turno')
        .select(`user_id, turnos( fecha_inicio, sedes(nombre), users!turnos_user_id_fkey(nombre) )`)
        .eq('id', solicitudId).single()

      const socioId   = solConDatos?.user_id
      const t         = solConDatos?.turnos
      const fechaStr  = t?.fecha_inicio
        ? new Date(t.fecha_inicio).toLocaleString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
        : 'próximamente'
      const sedeStr   = t?.sedes?.nombre ?? 'la sede'
      const entrenStr = t?.users?.nombre ?? 'el entrenador'

      const { data: socioData } = await supabase
        .from('users').select('nombre, email').eq('id', socioId).single()

      if (socioData) {
        await crearNotificacion({
          user_id: socioId,
          titulo:  'Clase particular confirmada',
          mensaje: `Tu clase del ${fechaStr} con ${entrenStr} fue confirmada.`,
          tipo:    'clase_confirmada',
          link:    '/mis-turnos',
        })
        const tmpl = emailClaseConfirmada({ nombre: socioData.nombre, fechaTurno: fechaStr, entrenador: entrenStr, sede: sedeStr })
        await enviarEmail({ to: socioData.email, ...tmpl })
      }
    } catch (notifErr) {
      console.error('Notif clase confirmada:', notifErr)
    }

    res.json({ message: 'Solicitud confirmada' })
  } catch (err) {
    console.error('PATCH /solicitudes/:id/confirmar', err)
    res.status(500).json({ error: 'Error al confirmar solicitud' })
  }
})

// ─── PATCH /solicitudes/:id/rechazar ─────────────────────────────────────────
// Rechazar = eliminar el registro (igual que liberar del lado del socio)
router.patch('/solicitudes/:solicitudId/rechazar', async (req, res) => {
  try {
    const entrenadorId = req.userId
    const { solicitudId } = req.params

    const { data: sol, error: errSol } = await supabase
      .from('socio_turno')
      .select('id, turno_id, user_id')
      .eq('id', solicitudId)
      .single()

    if (errSol || !sol) {
      return res.status(404).json({ error: 'Solicitud no encontrada' })
    }

    const { data: turno } = await supabase
      .from('turnos')
      .select('user_id')
      .eq('id', sol.turno_id)
      .single()

    if (!turno || turno.user_id !== entrenadorId) {
      return res.status(403).json({ error: 'Sin permiso' })
    }

    // Eliminar el registro para liberar el turno
    const { error } = await supabase
      .from('socio_turno')
      .delete()
      .eq('id', solicitudId)

    if (error) throw error

    // Notificación + email al socio
    try {
      const { data: turnoData } = await supabase
        .from('turnos')
        .select('fecha_inicio, users!turnos_user_id_fkey(nombre)')
        .eq('id', sol.turno_id).single()

      const { data: socioData } = await supabase
        .from('users').select('nombre, email').eq('id', sol.user_id).maybeSingle()

      if (socioData && turnoData) {
        const fechaStr  = new Date(turnoData.fecha_inicio).toLocaleString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
        const entrenStr = turnoData.users?.nombre ?? 'el entrenador'

        await crearNotificacion({
          user_id: sol.user_id,
          titulo:  'Solicitud de clase rechazada',
          mensaje: `Tu solicitud para la clase del ${fechaStr} con ${entrenStr} no fue confirmada.`,
          tipo:    'clase_rechazada',
          link:    '/clases-particulares',
        })
        const tmpl = emailClaseRechazada({ nombre: socioData.nombre, fechaTurno: fechaStr, entrenador: entrenStr })
        await enviarEmail({ to: socioData.email, ...tmpl })
      }
    } catch (notifErr) {
      console.error('Notif clase rechazada:', notifErr)
    }

    res.json({ message: 'Solicitud rechazada' })
  } catch (err) {
    console.error('PATCH /solicitudes/:id/rechazar', err)
    res.status(500).json({ error: 'Error al rechazar solicitud' })
  }
})

// ─── GET /niveles ─────────────────────────────────────────────────────────────
router.get('/niveles', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('niveles')
      .select('id, nombre, orden')
      .order('orden', { ascending: true })

    if (error) throw error
    res.json({ data: data || [] })
  } catch (err) {
    console.error('GET /niveles', err)
    res.status(500).json({ error: 'Error al obtener niveles' })
  }
})

// ─── GET /perfil ──────────────────────────────────────────────────────────────
router.get('/perfil', async (req, res) => {
  try {
    const entrenadorId = req.userId

    const { data: entrenador, error } = await supabase
      .from('users')
      .select(`
        id,
        nombre,
        email,
        foto_url,
        rating,
        clases_dadas,
        fecha_alta,
        club_id,
        clubes ( nombre )
      `)
      .eq('id', entrenadorId)
      .single()

    if (error || !entrenador) throw error || new Error('No encontrado')

    const { data: turnosEntrenador } = await supabase
      .from('turnos')
      .select('id')
      .eq('user_id', entrenadorId)

    const turnoIds = (turnosEntrenador || []).map((t) => t.id)

    let alumnosActivos = 0
    if (turnoIds.length > 0) {
      // Contar socios confirmados (estado=true) únicos
      const { data: inscUniq } = await supabase
        .from('socio_turno')
        .select('user_id')
        .in('turno_id', turnoIds)
        .eq('estado', true)

      const distintos = new Set((inscUniq || []).map((i) => i.user_id))
      alumnosActivos = distintos.size
    }

    res.json({
      data: {
        ...entrenador,
        club: entrenador.clubes?.nombre,
        alumnos_activos: alumnosActivos,
        en_el_club_desde: entrenador.fecha_alta
          ? new Date(entrenador.fecha_alta).getFullYear()
          : null,
      },
    })
  } catch (err) {
    console.error('GET /perfil', err)
    res.status(500).json({ error: 'Error al obtener perfil' })
  }
})

// ─── GET /comunicados ─────────────────────────────────────────────────────────
// Comunicados dirigidos a entrenadores o a todos
router.get('/comunicados', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('comunicados')
      .select('id, titulo, mensaje, fecha, destinatarios')
      .in('destinatarios', ['entrenadores', 'todos'])
      .order('fecha', { ascending: false })

    if (error) {
      if (error.code === '42P01') return res.json({ data: [] })
      throw error
    }
    res.json({ data: data ?? [] })
  } catch (err) {
    console.error('GET /entrenador/comunicados', err)
    res.status(500).json({ error: 'Error al obtener comunicados' })
  }
})

export default router
