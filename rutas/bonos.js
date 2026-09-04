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
import autenticar from '../src/middlewares/autenticar.js'
import supabase from '../src/config/db.js'

const router = express.Router()
router.use(autenticar)

// ── Helpers ───────────────────────────────────────────────────────────────────

function soloAdmin(req, res, next) {
  if (req.userTipo !== 3) {
    return res.status(403).json({ error: 'Acceso restringido a administradores' })
  }
  next()
}

/** Devuelve el bono activo y vigente de un socio, o null si no tiene. */
async function getBonoActivo(socioId) {
  const hoy = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const { data, error } = await supabase
    .from('bonos')
    .select('id, tipo, creditos_total, creditos_usados, fecha_inicio, fecha_vencimiento, notas')
    .eq('socio_id', socioId)
    .eq('activo', true)
    .lte('fecha_inicio',      hoy)
    .gte('fecha_vencimiento', hoy)
    .order('fecha_vencimiento', { ascending: true }) // el que vence antes primero
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bonos/mio — el socio ve su bono activo
// ─────────────────────────────────────────────────────────────────────────────
router.get('/mio', async (req, res) => {
  try {
    const bono = await getBonoActivo(req.userId)

    if (!bono) {
      return res.json({ data: null })
    }

    // Turno usados: filas en bono_turno para este bono
    const { data: usos } = await supabase
      .from('bono_turno')
      .select(`
        id,
        fecha_uso,
        turnos ( id, fecha_inicio, fecha_fin, sedes(nombre) )
      `)
      .eq('bono_id', bono.id)
      .order('fecha_uso', { ascending: false })

    res.json({
      data: {
        ...bono,
        creditos_disponibles: bono.creditos_total - bono.creditos_usados,
        usos: usos ?? [],
      },
    })
  } catch (err) {
    console.error('GET /bonos/mio', err)
    res.status(500).json({ error: 'Error al obtener bono' })
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

    const hoy = new Date().toISOString().split('T')[0]
    const bonos = (data ?? []).map(b => ({
      ...b,
      creditos_disponibles: b.creditos_total - b.creditos_usados,
      vigente: b.activo && b.fecha_inicio <= hoy && b.fecha_vencimiento >= hoy,
      creado_por_nombre: b.users?.nombre ?? '—',
    }))

    res.json({ data: bonos })
  } catch (err) {
    console.error('GET /bonos/socio/:socioId', err)
    res.status(500).json({ error: 'Error al obtener bonos del socio' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bonos — admin crea y asigna un bono a un socio
// Body: { socio_id, tipo, creditos_total, fecha_inicio, fecha_vencimiento, notas? }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', soloAdmin, async (req, res) => {
  const { socio_id, tipo, creditos_total, fecha_inicio, fecha_vencimiento, notas } = req.body

  if (!socio_id || !creditos_total || !fecha_inicio || !fecha_vencimiento) {
    return res.status(400).json({
      error: 'socio_id, creditos_total, fecha_inicio y fecha_vencimiento son requeridos',
    })
  }
  if (fecha_vencimiento < fecha_inicio) {
    return res.status(400).json({ error: 'La fecha de vencimiento debe ser posterior al inicio' })
  }
  if (creditos_total < 1 || creditos_total > 200) {
    return res.status(400).json({ error: 'creditos_total debe estar entre 1 y 200' })
  }

  try {
    // Verificar que el socio existe
    const { data: socio, error: errSocio } = await supabase
      .from('users')
      .select('id, nombre')
      .eq('id', socio_id)
      .eq('tipo_usuario_id', 1)
      .single()

    if (errSocio || !socio) {
      return res.status(404).json({ error: 'Socio no encontrado' })
    }

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

    res.status(201).json({
      data: { ...data, creditos_disponibles: data.creditos_total },
      mensaje: `Bono creado para ${socio.nombre}`,
    })
  } catch (err) {
    console.error('POST /bonos', err)
    res.status(500).json({ error: err.message || 'Error al crear bono' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/bonos/:id — admin desactiva un bono (no borra, soft-delete)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', soloAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('bonos')
      .update({ activo: false })
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ mensaje: 'Bono desactivado' })
  } catch (err) {
    console.error('DELETE /bonos/:id', err)
    res.status(500).json({ error: 'Error al desactivar bono' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Exportar helper para uso interno en admin.js y adminTurnos.js
// ─────────────────────────────────────────────────────────────────────────────
export { getBonoActivo }
export default router
