/**
 * rutas/turnos.js — Turnos de entrenamiento (socio)
 */
import express from 'express'
import autenticar, { requireRole } from '../src/middlewares/autenticar.js'
import supabase from '../src/config/db.js'
import responder from '../src/lib/responder.js'
import { responderError } from '../src/lib/errorNegocio.js'
import {
  obtenerTurnos,
  cancelarTurnoController,
  reconfirmarTurnoController,
  unirseListaController,
  salirListaController,
} from '../src/controllers/turnosController.js'
import { solicitarTurno, getTurnosDisponibles } from '../src/services/turnosService.js'

const router = express.Router()

router.use(autenticar, requireRole(1))

// ── Turnos disponibles para inscribirse (filtrados por nivel del socio) ────────
router.get('/disponibles', async (req, res) => {
  try {
    responder.ok(res, await getTurnosDisponibles(req.userId))
  } catch (err) {
    responderError(res, err, 'Error al obtener turnos disponibles')
  }
})

// ── Solicitar unirse a un turno (queda pendiente de aprobación) ───────────────
router.post('/solicitar', async (req, res) => {
  const { turno_id } = req.body
  if (!turno_id) return responder.error(res, 'turno_id es requerido')
  try {
    responder.creado(res, await solicitarTurno(turno_id, req.userId))
  } catch (err) {
    responderError(res, err, 'Error al enviar la solicitud')
  }
})

// ── Turnos del socio ──────────────────────────────────────────────────────────
router.get('/',                            obtenerTurnos)
router.delete('/:turnoId',                 cancelarTurnoController)
router.patch('/:turnoId/reconfirmar',      reconfirmarTurnoController)

// ── Lista de espera ───────────────────────────────────────────────────────────
router.post('/:turnoId/lista-espera',      unirseListaController)
router.delete('/:turnoId/lista-espera',    salirListaController)

// ── Cupo de un turno específico (para UI de reconfirmar/lista espera) ─────────
router.get('/:turnoId/cupo', async (req, res) => {
  const { turnoId } = req.params
  const socioId     = req.userId
  try {
    const { data: turno, error } = await supabase
      .from('turnos')
      .select('id, capacidad_maxima, socio_turno(id, estado, user_id)')
      .eq('id', turnoId)
      .single()

    if (error || !turno) return responder.noEncontrado(res, 'Turno no encontrado')

    const activos        = (turno.socio_turno ?? []).filter(s => s.estado === true).length
    const cupoDisponible = Math.max(0, turno.capacidad_maxima - activos)
    const estaInscripto  = (turno.socio_turno ?? []).some(s => s.user_id === socioId && s.estado === true)
    const tieneCancelado = (turno.socio_turno ?? []).some(s => s.user_id === socioId && s.estado === false)

    const { count: enEspera } = await supabase
      .from('lista_espera_turno')
      .select('id', { count: 'exact', head: true })
      .eq('turno_id', turnoId)
      .eq('user_id', socioId)
      .eq('estado', 'esperando')
    const enListaEspera = (enEspera ?? 0) > 0

    res.json({
      ok: true,
      data: {
        cupo_disponible: cupoDisponible,
        inscriptos:      activos,
        capacidad:       turno.capacidad_maxima,
        esta_inscripto:  estaInscripto,
        tiene_cancelado: tieneCancelado,
        en_lista_espera: enListaEspera,
      },
    })
  } catch (err) {
    console.error('GET /turnos/:turnoId/cupo', err)
    res.status(500).json({ ok: false, mensaje: 'Error al obtener información del turno' })
  }
})

export default router
