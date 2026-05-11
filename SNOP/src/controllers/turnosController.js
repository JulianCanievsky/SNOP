const turnosService = require('../services/turnosService');

/**
 * GET /socios/:socioId/turnos
 * Query params opcionales: desde, hasta, estado
 *
 * Retorna la lista de turnos del socio, con separación lógica
 * entre próximos y pasados para que el frontend pueda renderizar ambas secciones.
 */
const listarTurnos = async (req, res) => {
  try {
    const socioId = parseInt(req.params.socioId, 10);

    // Seguridad: un socio solo puede ver sus propios turnos
    if (req.usuario.userId !== socioId && req.usuario.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado.' });
    }

    const { desde, hasta, estado } = req.query;
    const filtros = { desde, hasta, estado };

    const turnos = await turnosService.obtenerTurnosPorSocio(socioId, filtros);

    // Separar próximos y pasados para facilitar el renderizado en el frontend
    const ahora = new Date();
    const proximos = turnos.filter((t) => new Date(t.fecha_inicio) >= ahora);
    const pasados  = turnos.filter((t) => new Date(t.fecha_inicio) <  ahora);

    return res.json({
      total: turnos.length,
      proximos,
      pasados,
    });
  } catch (err) {
    console.error('Error al listar turnos:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

/**
 * GET /socios/:socioId/turnos/semana
 * Query param requerido: semana (formato YYYY-WW)
 *
 * Retorna los turnos agrupados por día para la semana indicada.
 * Los días sin turnos se devuelven con array vacío.
 */
const listarTurnosPorSemana = async (req, res) => {
  try {
    const socioId = parseInt(req.params.socioId, 10);

    if (req.usuario.userId !== socioId && req.usuario.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado.' });
    }

    const { semana } = req.query;

    if (!semana) {
      return res.status(400).json({ error: 'El parámetro semana es obligatorio (YYYY-WW).' });
    }

    const agrupado = await turnosService.obtenerTurnosPorSemana(socioId, semana);

    return res.json({ semana, dias: agrupado });
  } catch (err) {
    if (err.message && err.message.includes('formato')) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Error al listar turnos por semana:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

/**
 * DELETE /turnos/:turnoId
 * Body: no requiere (el socioId se extrae del JWT)
 *
 * Cancela la inscripción del socio al turno.
 * Valida:
 *  - Que el turno pertenece al socio autenticado
 *  - Política de cancelación (horas mínimas de anticipación según config del club)
 */
const cancelarTurno = async (req, res) => {
  try {
    const turnoId = parseInt(req.params.turnoId, 10);
    const socioId = req.usuario.userId;
    const clubId  = req.usuario.clubId;

    // Obtener política de cancelación del club
    const horasMinimas = await turnosService.obtenerHorasMinCancelacion(clubId);

    const resultado = await turnosService.cancelarTurno(turnoId, socioId, horasMinimas);

    return res.json({
      mensaje: 'Turno cancelado correctamente.',
      inscripcion: resultado,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.mensaje });
    }
    console.error('Error al cancelar turno:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

module.exports = {
  listarTurnos,
  listarTurnosPorSemana,
  cancelarTurno,
};