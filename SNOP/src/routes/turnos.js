const express = require('express');
const router  = express.Router();

const { autenticar, requireRole } = require('../middlewares/autenticar');
const turnosController = require('../controllers/turnosController');

/**
 * Rutas de Mis Turnos — Socio (Pantalla 5)
 *
 * GET  /socios/:socioId/turnos          → lista de turnos (próximos + pasados)
 * GET  /socios/:socioId/turnos/semana   → turnos agrupados por día de semana
 * DELETE /turnos/:turnoId              → cancelar inscripción al turno
 */

// El orden importa: /semana debe ir antes de /:turnoId si fueran params del mismo nivel
// Aquí están en distintos prefijos, no hay conflicto.

router.get(
  '/socios/:socioId/turnos',
  autenticar,
  requireRole('socio', 'admin'),
  turnosController.listarTurnos
);

router.get(
  '/socios/:socioId/turnos/semana',
  autenticar,
  requireRole('socio', 'admin'),
  turnosController.listarTurnosPorSemana
);

router.delete(
  '/turnos/:turnoId',
  autenticar,
  requireRole('socio'),
  turnosController.cancelarTurno
);

module.exports = router;