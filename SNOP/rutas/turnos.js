import express from 'express'
import autenticar from '../src/middlewares/autenticar.js'
import {
  obtenerTurnos,
  cancelarTurnoController,
  reconfirmarTurnoController,
} from '../src/controllers/turnosController.js'

const router = express.Router()

// Todas las rutas requieren JWT válido.
// El socioId se lee del token (req.userId) — no de la URL.
router.get('/',                          autenticar, obtenerTurnos)
router.delete('/:turnoId',               autenticar, cancelarTurnoController)
router.patch('/:turnoId/reconfirmar',    autenticar, reconfirmarTurnoController)

export default router
