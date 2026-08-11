import express from 'express'
import autenticar from '../src/middlewares/autenticar.js'
import supabase from '../src/config/db.js'
import {
  obtenerTurnos,
  cancelarTurnoController,
  reconfirmarTurnoController,
} from '../src/controllers/turnosController.js'

const router = express.Router()

router.use(autenticar)

// ── Turnos del socio ──────────────────────────────────────────────────────────
router.get('/',                       obtenerTurnos)
router.delete('/:turnoId',            cancelarTurnoController)
router.patch('/:turnoId/reconfirmar', reconfirmarTurnoController)

export default router
