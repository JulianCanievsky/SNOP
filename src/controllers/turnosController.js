import {
  getTurnosBySocio,
  cancelarTurno,
  reconfirmarTurno,
} from '../services/turnosService.js'

export async function obtenerTurnos(req, res) {
  // socioId viene del JWT, no de la URL — evita que un socio vea turnos de otro
  const socioId = req.userId
  try {
    const turnos = await getTurnosBySocio(socioId)
    res.status(200).json({ ok: true, data: turnos })
  } catch (error) {
    console.error('ERROR OBTENER TURNOS:', error)
    res.status(500).json({ ok: false, mensaje: 'Error al obtener turnos' })
  }
}

export async function cancelarTurnoController(req, res) {
  const socioId = req.userId
  const { turnoId } = req.params
  try {
    const resultado = await cancelarTurno(turnoId, socioId)
    res.status(200).json({ ok: true, data: resultado })
  } catch (error) {
    console.error('ERROR CANCELAR TURNO:', error)
    res.status(400).json({ ok: false, mensaje: error.message || 'Error al cancelar turno' })
  }
}

export async function reconfirmarTurnoController(req, res) {
  const socioId = req.userId
  const { turnoId } = req.params
  try {
    const resultado = await reconfirmarTurno(turnoId, socioId)
    res.status(200).json({ ok: true, data: resultado })
  } catch (error) {
    console.error('ERROR RECONFIRMAR TURNO:', error)
    res.status(400).json({ ok: false, mensaje: error.message || 'Error al reconfirmar turno' })
  }
}
