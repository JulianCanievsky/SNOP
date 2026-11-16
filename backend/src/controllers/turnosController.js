/**
 * Handlers de /api/turnos (socio). La lógica vive en services/turnosService.js.
 * socioId SIEMPRE sale del JWT (req.userId), nunca de la URL ni del body.
 */
import {
  getTurnosBySocio,
  getTurnosCancelados,
  cancelarTurno,
  reconfirmarTurno,
  unirseLista,
  salirLista,
} from '../services/turnosService.js'
import responder from '../lib/responder.js'
import { responderError } from '../lib/errorNegocio.js'

export async function obtenerTurnos(req, res) {
  try {
    const [{ proximos, historial }, cancelados] = await Promise.all([
      getTurnosBySocio(req.userId),
      getTurnosCancelados(req.userId),
    ])
    // Además de data (próximos), se mandan historial y cancelados al mismo nivel
    res.json({
      ok:         true,
      data:       proximos,          // fecha_fin >= ahora
      historial:  historial ?? [],   // fecha_fin <  ahora
      cancelados: cancelados ?? [],
    })
  } catch (err) {
    responderError(res, err, 'Error al obtener turnos')
  }
}

export async function cancelarTurnoController(req, res) {
  try {
    responder.ok(res, await cancelarTurno(req.params.turnoId, req.userId))
  } catch (err) {
    responderError(res, err, 'Error al cancelar turno')
  }
}

export async function reconfirmarTurnoController(req, res) {
  try {
    responder.ok(res, await reconfirmarTurno(req.params.turnoId, req.userId))
  } catch (err) {
    responderError(res, err, 'Error al reconfirmar turno')
  }
}

export async function unirseListaController(req, res) {
  try {
    responder.creado(res, await unirseLista(req.params.turnoId, req.userId))
  } catch (err) {
    responderError(res, err, 'Error al unirse a la lista de espera')
  }
}

export async function salirListaController(req, res) {
  try {
    await salirLista(req.params.turnoId, req.userId)
    responder.ok(res, null)
  } catch (err) {
    responderError(res, err, 'Error al salir de la lista de espera')
  }
}
