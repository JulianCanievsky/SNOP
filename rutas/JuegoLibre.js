/**
 * rutas/JuegoLibre.js — Juego libre (socio)
 *
 *   GET    /api/juego-libre                 — eventos futuros (filtros ?sede_id&fecha=YYYY-MM-DD)
 *   POST   /api/juego-libre/:id/inscribir   — anotarse (respeta cupo y categorías habilitadas)
 *   DELETE /api/juego-libre/:id/cancelar    — cancelar la inscripción
 */
import express from 'express'
import autenticar, { requireRole } from '../src/middlewares/autenticar.js'
import supabase from '../src/config/db.js'
import responder from '../src/lib/responder.js'
import { formatArES } from '../src/lib/fecha.js'
import { nivelHabilitado } from '../src/constants/categorias.js'
import { crearNotificacion, enviarEmail, emailJuegoLibreLleno } from '../src/lib/notificaciones.js'

const router = express.Router()
router.use(autenticar, requireRole(1))

/** Categoría actual del socio (de la BD, no del JWT: puede haber cambiado). */
async function nivelDelSocio(socioId) {
  const { data } = await supabase.from('users').select('nivel_id').eq('id', socioId).maybeSingle()
  return data?.nivel_id ?? null
}

async function contarActivos(eventoId) {
  const { count } = await supabase
    .from('inscripciones_juego_libre')
    .select('id', { count: 'exact', head: true })
    .eq('evento_id', eventoId)
    .eq('estado', 'activo')
  return count ?? 0
}

// ── GET /api/juego-libre ──────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { sede_id, fecha } = req.query
    const socioId = req.userId

    let query = supabase
      .from('juego_libre')
      .select('*, sedes ( nombre )')
      .eq('activo', true)
      .gte('fecha_fin', new Date().toISOString())
      .order('fecha_inicio', { ascending: true })

    if (sede_id) query = query.eq('sede_id', sede_id)
    if (fecha) {
      // fecha = día en hora argentina
      const desde = new Date(`${fecha}T00:00:00-03:00`)
      const hasta = new Date(desde.getTime() + 24 * 60 * 60 * 1000)
      query = query.gte('fecha_inicio', desde.toISOString()).lt('fecha_inicio', hasta.toISOString())
    }

    const [{ data: eventos, error }, nivelSocio] = await Promise.all([query, nivelDelSocio(socioId)])
    if (error) throw error

    const eventoIds = (eventos ?? []).map(e => e.id)
    let inscripciones = []
    if (eventoIds.length > 0) {
      const { data, error: errInsc } = await supabase
        .from('inscripciones_juego_libre')
        .select('evento_id, socio_id')
        .eq('estado', 'activo')
        .in('evento_id', eventoIds)
      if (errInsc) throw errInsc
      inscripciones = data ?? []
    }

    const socioIds = [...new Set(inscripciones.map(i => i.socio_id))]
    let usuarios = []
    if (socioIds.length > 0) {
      const { data, error: errUsers } = await supabase
        .from('users')
        .select('id, nombre, foto_url')
        .in('id', socioIds)
      if (errUsers) throw errUsers
      usuarios = data ?? []
    }

    const resultado = (eventos ?? []).map(evento => {
      const anotados = inscripciones.filter(i => i.evento_id === evento.id)
      return {
        ...evento,
        niveles_habilitados: evento.niveles_habilitados ?? [],
        inscriptos:   anotados.length,
        nombre_sede:  evento.sedes?.nombre ?? `Sede ${evento.sede_id}`,
        estado:       anotados.length >= evento.capacidad_maxima ? 'completo' : 'abierto',
        ya_inscripto: anotados.some(i => i.socio_id === socioId),
        habilitado:   nivelHabilitado(evento.niveles_habilitados, nivelSocio),
        participantes: anotados.map(i => {
          const u = usuarios.find(u => u.id === i.socio_id)
          return { nombre: u?.nombre || '?', foto_url: u?.foto_url || null }
        }),
      }
    })

    responder.ok(res, resultado)
  } catch (err) {
    console.error('GET /api/juego-libre', err)
    responder.interno(res, 'Error al obtener juego libre')
  }
})

// ── POST /api/juego-libre/:id/inscribir ───────────────────────────────────────
router.post('/:id/inscribir', async (req, res) => {
  const eventoId = parseInt(req.params.id, 10)
  const socioId  = req.userId

  try {
    const { data: evento, error: errEvento } = await supabase
      .from('juego_libre')
      .select('*')
      .eq('id', eventoId)
      .eq('activo', true)
      .maybeSingle()

    if (errEvento || !evento) return responder.noEncontrado(res, 'Evento no encontrado')
    if (new Date(evento.fecha_fin) < new Date()) return responder.error(res, 'El evento ya terminó')

    if (!nivelHabilitado(evento.niveles_habilitados, await nivelDelSocio(socioId))) {
      return responder.sinPermiso(res, 'Este juego libre no está habilitado para tu categoría')
    }

    // ¿Tiene una fila previa? (activa → error; cancelada → se reactiva)
    const { data: previa } = await supabase
      .from('inscripciones_juego_libre')
      .select('id, estado')
      .eq('evento_id', eventoId)
      .eq('socio_id', socioId)
      .order('fecha_inscripcion', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (previa?.estado === 'activo') return responder.conflicto(res, 'Ya estás inscripto')

    if (await contarActivos(eventoId) >= evento.capacidad_maxima) {
      return responder.conflicto(res, 'El evento está completo')
    }

    const { error: errInsc } = previa
      ? await supabase
          .from('inscripciones_juego_libre')
          .update({ estado: 'activo', fecha_inscripcion: new Date().toISOString() })
          .eq('id', previa.id)
      : await supabase
          .from('inscripciones_juego_libre')
          .insert({ evento_id: eventoId, socio_id: socioId, estado: 'activo' })

    if (errInsc) {
      if (errInsc.code === '23505') return responder.conflicto(res, 'Ya estás inscripto')
      throw errInsc
    }

    // Control post-escritura contra carreras: si nos pasamos del cupo, se revierte
    const totalFinal = await contarActivos(eventoId)
    if (totalFinal > evento.capacidad_maxima) {
      await supabase
        .from('inscripciones_juego_libre')
        .update({ estado: 'cancelado' })
        .eq('evento_id', eventoId)
        .eq('socio_id', socioId)
        .eq('estado', 'activo')
      return responder.conflicto(res, 'El evento está completo')
    }

    if (totalFinal === evento.capacidad_maxima) {
      avisarAdminsEventoLleno(evento).catch(err => console.error('[juego-libre] aviso lleno:', err))
    }

    responder.ok(res, null)
  } catch (err) {
    console.error('POST /api/juego-libre/:id/inscribir', err)
    responder.interno(res, 'Error al inscribirse')
  }
})

// ── DELETE /api/juego-libre/:id/cancelar ──────────────────────────────────────
router.delete('/:id/cancelar', async (req, res) => {
  try {
    const { error } = await supabase
      .from('inscripciones_juego_libre')
      .update({ estado: 'cancelado' })
      .eq('evento_id', parseInt(req.params.id, 10))
      .eq('socio_id', req.userId)
      .eq('estado', 'activo')

    if (error) throw error
    responder.ok(res, null)
  } catch (err) {
    console.error('DELETE /api/juego-libre/:id/cancelar', err)
    responder.interno(res, 'Error al cancelar')
  }
})

/** Notificación in-app + email a todos los admins cuando un juego libre se llena. */
async function avisarAdminsEventoLleno(evento) {
  const [{ data: admins }, { data: sede }] = await Promise.all([
    supabase.from('users').select('id, nombre, email').eq('tipo_usuario_id', 3).eq('activo', true),
    supabase.from('sedes').select('nombre').eq('id', evento.sede_id).maybeSingle(),
  ])
  const fechaStr = formatArES(evento.fecha_inicio)
  const sedeStr  = sede?.nombre ?? 'la sede'

  for (const admin of admins ?? []) {
    await crearNotificacion({
      user_id: admin.id,
      titulo:  'Juego libre completo',
      mensaje: `El espacio del ${fechaStr} en ${sedeStr} se llenó (${evento.capacidad_maxima}/${evento.capacidad_maxima}).`,
      tipo:    'juego_libre_lleno',
      link:    '/admin/juego-libre',
    })
    await enviarEmail({
      to: admin.email,
      ...emailJuegoLibreLleno({
        adminNombre: admin.nombre,
        sede:        sedeStr,
        fechaEvento: fechaStr,
        capacidad:   evento.capacidad_maxima,
      }),
    })
  }
}

export default router
