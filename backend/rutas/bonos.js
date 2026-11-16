/**
 * rutas/bonos.js — Sistema de bonos de créditos
 *
 * Admin:
 *   POST   /api/bonos                    — crear bono y asignarlo a un socio
 *   GET    /api/bonos/socio/:socioId      — listar todos los bonos de un socio
 *   DELETE /api/bonos/:id                 — desactivar un bono
 *
 * Socio:
 *   GET    /api/bonos/mio                 — ver su bono activo + créditos restantes
 */

import express from 'express'
import autenticar, { requireRole } from '../src/middlewares/autenticar.js'
import supabase from '../src/config/db.js'
import responder from '../src/lib/responder.js'
import { hoyAR } from '../src/lib/fecha.js'

const router = express.Router()
router.use(autenticar)

// ── Helpers ───────────────────────────────────────────────────────────────────

const soloAdmin = requireRole(3)

/** Devuelve el bono activo y vigente de un socio, o null si no tiene. */
async function getBonoActivo(socioId) {
  const hoyStr = hoyAR()
  const { data, error } = await supabase
    .from('bonos')
    .select('id, tipo, creditos_total, creditos_usados, fecha_inicio, fecha_vencimiento, notas')
    .eq('socio_id', socioId)
    .eq('activo', true)
    .lte('fecha_inicio',      hoyStr)
    .gte('fecha_vencimiento', hoyStr)
    .order('fecha_vencimiento', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bonos/mio — el socio ve su bono activo
// ─────────────────────────────────────────────────────────────────────────────
router.get('/mio', requireRole(1), async (req, res) => {
  try {
    const bono = await getBonoActivo(req.userId)
    if (!bono) return responder.ok(res, null)

    const { data: usos } = await supabase
      .from('bono_turno')
      .select('id, fecha_uso, turnos ( id, fecha_inicio, fecha_fin, sedes(nombre) )')
      .eq('bono_id', bono.id)
      .order('fecha_uso', { ascending: false })

    responder.ok(res, {
      ...bono,
      creditos_disponibles: bono.creditos_total - bono.creditos_usados,
      usos: usos ?? [],
    })
  } catch (err) {
    console.error('GET /bonos/mio', err)
    responder.interno(res, 'Error al obtener bono')
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bonos/socio/:socioId — admin ve todos los bonos de un socio
// ─────────────────────────────────────────────────────────────────────────────
router.get('/socio/:socioId', soloAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bonos')
      .select(`
        id, tipo, creditos_total, creditos_usados,
        fecha_inicio, fecha_vencimiento, activo, notas, created_at,
        users!bonos_creado_por_fkey ( nombre )
      `)
      .eq('socio_id', req.params.socioId)
      .order('created_at', { ascending: false })

    if (error) throw error

    const hoyStr = hoyAR()
    const bonos = (data ?? []).map(b => ({
      ...b,
      creditos_disponibles: b.creditos_total - b.creditos_usados,
      vigente: b.activo && b.fecha_inicio <= hoyStr && b.fecha_vencimiento >= hoyStr,
      creado_por_nombre: b.users?.nombre ?? '—',
    }))

    responder.ok(res, bonos)
  } catch (err) {
    console.error('GET /bonos/socio/:socioId', err)
    responder.interno(res, 'Error al obtener bonos del socio')
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bonos — admin crea y asigna un bono a un socio
// Body: { socio_id, tipo, creditos_total, fecha_inicio, fecha_vencimiento, notas? }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', soloAdmin, async (req, res) => {
  const { socio_id, tipo, creditos_total, fecha_inicio, fecha_vencimiento, notas } = req.body

  if (!socio_id || !creditos_total || !fecha_inicio || !fecha_vencimiento) {
    return responder.error(res, 'socio_id, creditos_total, fecha_inicio y fecha_vencimiento son requeridos')
  }
  if (fecha_vencimiento < fecha_inicio) {
    return responder.error(res, 'La fecha de vencimiento debe ser posterior al inicio')
  }
  if (creditos_total < 1 || creditos_total > 200) {
    return responder.error(res, 'creditos_total debe estar entre 1 y 200')
  }

  try {
    const { data: socio, error: errSocio } = await supabase
      .from('users')
      .select('id, nombre')
      .eq('id', socio_id)
      .eq('tipo_usuario_id', 1)
      .single()

    if (errSocio || !socio) return responder.noEncontrado(res, 'Socio no encontrado')

    const { data, error } = await supabase
      .from('bonos')
      .insert({
        socio_id,
        tipo:              tipo || 'mensual',
        creditos_total,
        creditos_usados:   0,
        fecha_inicio,
        fecha_vencimiento,
        activo:            true,
        notas:             notas?.trim() || null,
        creado_por:        req.userId,
      })
      .select()
      .single()

    if (error) throw error

    responder.creado(res, { ...data, creditos_disponibles: data.creditos_total })
  } catch (err) {
    console.error('POST /bonos', err)
    responder.interno(res, 'Error al crear bono')
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/bonos/:id — admin desactiva un bono (soft-delete)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', soloAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('bonos')
      .update({ activo: false })
      .eq('id', req.params.id)

    if (error) throw error
    responder.ok(res, null)
  } catch (err) {
    console.error('DELETE /bonos/:id', err)
    responder.interno(res, 'Error al desactivar bono')
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Exportar helper para uso interno en adminTurnos.js
// ─────────────────────────────────────────────────────────────────────────────
export { getBonoActivo }
export default router
