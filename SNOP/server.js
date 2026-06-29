process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'

import juegoLibreRoutes       from './rutas/JuegoLibre.js'
import turnosRoutes           from './rutas/turnos.js'
import clasesParticularesRoutes from './rutas/clasesParticulares.js'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

app.post('/auth/login-dev', async (_req, res) => {
  const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET)
  res.json({ token })
})

app.use('/juego-libre',              juegoLibreRoutes)
app.use('/api/juego-libre',          juegoLibreRoutes)
app.use('/api/turnos',               turnosRoutes)
app.use('/api/clases-particulares',  clasesParticularesRoutes)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})
