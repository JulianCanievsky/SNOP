import {
  getTurnosBySocio,
  cancelarTurno
} from "../services/turnosService.js";

// =====================================
// Obtener turnos de un socio
// GET /api/turnos/:socioId
// =====================================
export async function obtenerTurnos(req, res) {

  const { socioId } = req.params;

  try {

    const turnos =
      await getTurnosBySocio(socioId);

    res.status(200).json({
      ok: true,
      data: turnos
    });

  } catch (error) {

    // ERROR COMPLETO EN TERMINAL
    console.error("ERROR OBTENER TURNOS:");
    console.error(error);

    // ERROR DETALLADO
    if (error.message) {
      console.error("MESSAGE:", error.message);
    }

    if (error.details) {
      console.error("DETAILS:", error.details);
    }

    if (error.hint) {
      console.error("HINT:", error.hint);
    }

    if (error.code) {
      console.error("CODE:", error.code);
    }

    res.status(500).json({
      ok: false,
      mensaje: "Error al obtener turnos"
    });
  }
}

// =====================================
// Cancelar turno
// DELETE /api/turnos/:turnoId/socio/:socioId
// =====================================
export async function cancelarTurnoController(req, res) {

  const {
    turnoId,
    socioId
  } = req.params;

  try {

    const resultado =
      await cancelarTurno(turnoId, socioId);

    res.status(200).json({
      ok: true,
      data: resultado
    });

  } catch (error) {

    // ERROR COMPLETO EN TERMINAL
    console.error("ERROR CANCELAR TURNO:");
    console.error(error);

    // ERROR DETALLADO
    if (error.message) {
      console.error("MESSAGE:", error.message);
    }

    if (error.details) {
      console.error("DETAILS:", error.details);
    }

    if (error.hint) {
      console.error("HINT:", error.hint);
    }

    if (error.code) {
      console.error("CODE:", error.code);
    }

    res.status(400).json({
      ok: false,
      mensaje: error.message || "Error al cancelar turno"
    });
  }
}