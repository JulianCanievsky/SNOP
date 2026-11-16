/**
 * rutas/torneos.js — endpoints de torneos para socios
 *
 * GET  /api/torneos            — lista torneos activos con inscripción del socio
 * POST /api/torneos/:id/inscribir
 * DELETE /api/torneos/:id/cancelar
 */
import express from 'express'
import autenticar, { requireRole } from '../src/middlewares/autenticar.js'
import supabase from '../src/config/db.js'
import responder from '../src/lib/responder.js'
import { hoyAR } from '../src/lib/fecha.js'
import { nivelHabilitado } from '../src/constants/categorias.js'

const router = express.Router()
router.use(autenticar, requireRole(1))

/** Categoría actual del socio (de la BD, no del JWT: puede haber cambiado). */
async function nivelDelSocio(socioId) {
  const { data } = await supabase.from('users').select('nivel_id').eq('id', socioId).maybeSingle()
  return data?.nivel_id ?? null
}

// ── GET /api/torneos ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const socioId = req.userId
  try {
    const hoy = new Date(`${hoyAR()}T00:00:00-03:00`)
    const nivelSocio = await nivelDelSocio(socioId)

    const { data: torneos, error } = await supabase
      .from('torneos')
      .select(`
        id, nombre, fecha_inicio, fecha_fin, modalidad,
        capacidad_maxima, niveles_habilitados,
        sedes(nombre),
        inscripciones_torneo(id, socio_id, estado)
      `)
      .eq('activo', true)
      .gte('fecha_inicio', hoy.toISOString())
      .order('fecha_inicio', { ascending: true })

    if (error) {
      if (error.code === '42P01') return responder.ok(res, [])
      throw error
    }

    const allInscIds = (torneos ?? []).flatMap(t =>
      (t.inscripciones_torneo ?? [])
        .filter(i => i.estado === 'activo')
        .map(i => i.socio_id)
    )
    const uniqueIds = [...new Set(allInscIds)]
    let usuarios = []
    if (uniqueIds.length > 0) {
      const { data: u } = await supabase
        .from('users')
        .select('id, nombre, foto_url')
        .in('id', uniqueIds)
      usuarios = u ?? []
    }

    const resultado = (torneos ?? []).map(t => {
      const activos     = (t.inscripciones_torneo ?? []).filter(i => i.estado === 'activo')
      const yaInscripto = activos.some(i => i.socio_id === socioId)
      return {
        id:                  t.id,
        nombre:              t.nombre,
        fecha_inicio:        t.fecha_inicio,
        fecha_fin:           t.fecha_fin,
        modalidad:           t.modalidad,
        capacidad_maxima:    t.capacidad_maxima,
        niveles_habilitados: t.niveles_habilitados ?? [],
        nombre_sede:         t.sedes?.nombre ?? '—',
        inscriptos:          activos.length,
        ya_inscripto:        yaInscripto,
        habilitado:          nivelHabilitado(t.niveles_habilitados, nivelSocio),
        estado:              activos.length >= t.capacidad_maxima ? 'completo' : 'abierto',
        participantes:       activos.map(i => {
          const u = usuarios.find(u => u.id === i.socio_id)
          return { nombre: u?.nombre || '?', foto_url: u?.foto_url || null }
        }),
      }
    })

    responder.ok(res, resultado)
  } catch (err) {
    console.error('GET /api/torneos', err)
    responder.interno(res, 'Error al obtener torneos')
  }
})

// ── POST /api/torneos/:id/inscribir ───────────────────────────────────────────
router.post('/:id/inscribir', async (req, res) => {
  const socioId  = req.userId
  const torneoId = parseInt(req.params.id)

  try {
    const { data: torneo, error: errT } = await supabase
      .from('torneos')
      .select('id, capacidad_maxima, activo, fecha_inicio, niveles_habilitados, inscripciones_torneo(id, estado)')
      .eq('id', torneoId)
      .single()

    if (errT || !torneo) return responder.noEncontrado(res, 'Torneo no encontrado')
    if (!torneo.activo)  return responder.error(res, 'El torneo no está disponible')
    if (new Date(torneo.fecha_inicio) < new Date()) return responder.error(res, 'El torneo ya empezó')

    if (!nivelHabilitado(torneo.niveles_habilitados, await nivelDelSocio(socioId))) {
      return responder.sinPermiso(res, 'Este torneo no está habilitado para tu categoría')
    }

    const activos = (torneo.inscripciones_torneo ?? []).filter(i => i.estado === 'activo')
    if (activos.length >= torneo.capacidad_maxima) {
      return responder.error(res, 'El torneo está completo')
    }

    // ¿Tiene una fila previa? (activa → error; cancelada → se reactiva)
    const { data: previa } = await supabase
      .from('inscripciones_torneo')
      .select('id, estado')
      .eq('torneo_id', torneoId)
      .eq('socio_id', socioId)
      .order('fecha_inscripcion', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (previa?.estado === 'activo') return responder.conflicto(res, 'Ya estás inscripto en este torneo')

    const { error: errI } = previa
      ? await supabase
          .from('inscripciones_torneo')
          .update({ estado: 'activo', fecha_inscripcion: new Date().toISOString() })
          .eq('id', previa.id)
      : await supabase
          .from('inscripciones_torneo')
          .insert({ torneo_id: torneoId, socio_id: socioId, estado: 'activo' })

    if (errI) {
      if (errI.code === '23505') return responder.conflicto(res, 'Ya estás inscripto en este torneo')
      throw errI
    }

    responder.ok(res, null, 201)
  } catch (err) {
    console.error('POST /api/torneos/:id/inscribir', err)
    responder.interno(res, 'Error al inscribirse')
  }
})

// ── DELETE /api/torneos/:id/cancelar ─────────────────────────────────────────
router.delete('/:id/cancelar', async (req, res) => {
  const socioId  = req.userId
  const torneoId = parseInt(req.params.id)

  try {
    const { error } = await supabase
      .from('inscripciones_torneo')
      .update({ estado: 'cancelado' })
      .eq('torneo_id', torneoId)
      .eq('socio_id', socioId)
      .eq('estado', 'activo')

    if (error) throw error
    responder.ok(res, null)
  } catch (err) {
    console.error('DELETE /api/torneos/:id/cancelar', err)
    responder.interno(res, 'Error al cancelar inscripción')
  }
})

export default router
