import express from 'express'
import autenticar from '../src/middlewares/autenticar.js'
import supabase from '../src/config/db.js'
import {
  obtenerTurnos,
  cancelarTurnoController,
  reconfirmarTurnoController,
  unirseListaController,
  salirListaController,
} from '../src/controllers/turnosController.js'

const router = express.Router()

router.use(autenticar)

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

    if (error || !turno) return res.status(404).json({ ok: false, mensaje: 'Turno no encontrado' })

    const activos        = (turno.socio_turno ?? []).filter(s => s.estado === true).length
    const cupoDisponible = Math.max(0, turno.capacidad_maxima - activos)
    const estaInscripto  = (turno.socio_turno ?? []).some(s => s.user_id === socioId && s.estado === true)
    const tieneCancelado = (turno.socio_turno ?? []).some(s => s.user_id === socioId && s.estado === false)

    let enListaEspera = false
    try {
      const { data: listaRow } = await supabase
        .from('lista_espera_turno')
        .select('id')
        .eq('turno_id', turnoId)
        .eq('user_id', socioId)
        .maybeSingle()
      enListaEspera = !!listaRow
    } catch { /* tabla puede no existir aún */ }

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
