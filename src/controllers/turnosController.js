import {
  getTurnosBySocio,
  getTurnosCancelados,
  cancelarTurno,
  reconfirmarTurno,
  unirseLista,
  salirLista,
} from '../services/turnosService.js'

export async function obtenerTurnos(req, res) {
  // socioId viene del JWT, no de la URL — evita que un socio vea turnos de otro
  const socioId = req.userId
  try {
    const [activos, cancelados] = await Promise.all([
      getTurnosBySocio(socioId),
      getTurnosCancelados(socioId),
    ])
    res.status(200).json({ ok: true, data: activos, cancelados: cancelados ?? [] })
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

export async function unirseListaController(req, res) {
  const socioId = req.userId
  const { turnoId } = req.params
  try {
    const resultado = await unirseLista(turnoId, socioId)
    res.status(201).json({ ok: true, data: resultado })
  } catch (error) {
    console.error('ERROR UNIRSE LISTA:', error)
    res.status(400).json({ ok: false, mensaje: error.message || 'Error al unirse a la lista de espera' })
  }
}

export async function salirListaController(req, res) {
  const socioId = req.userId
  const { turnoId } = req.params
  try {
    await salirLista(turnoId, socioId)
    res.status(200).json({ ok: true })
  } catch (error) {
    console.error('ERROR SALIR LISTA:', error)
    res.status(400).json({ ok: false, mensaje: error.message || 'Error al salir de la lista de espera' })
  }
}
