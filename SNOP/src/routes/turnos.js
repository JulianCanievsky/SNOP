import express from "express";

import {
  obtenerTurnos,
  cancelarTurnoController
} from "../controllers/turnosController.js";

const router = express.Router();

// GET turnos
router.get("/:socioId", obtenerTurnos);

// DELETE cancelar
router.delete(
  "/:turnoId/socio/:socioId",
  cancelarTurnoController
);

export default router;