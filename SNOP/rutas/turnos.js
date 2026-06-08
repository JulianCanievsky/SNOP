import express from "express";
import {
  obtenerTurnos,
  cancelarTurnoController,
  reconfirmarTurnoController,
} from "../src/controllers/turnosController.js";

const router = express.Router();

router.get("/:socioId", obtenerTurnos);
router.delete("/:turnoId/socio/:socioId", cancelarTurnoController);
router.patch("/:turnoId/socio/:socioId/reconfirmar", reconfirmarTurnoController);

export default router;