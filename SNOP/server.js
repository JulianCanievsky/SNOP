process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'

import juegoLibreRoutes from './rutas/JuegoLibre.js'
import turnos from './rutas/turnos.js'
import clasesParticularesRoutes from './rutas/clasesParticulares.js'

dotenv.config()

const app = express()

// Middleware PRIMERO
app.use(cors())
app.use(express.json())

// Login de desarrollo
app.post('/auth/login-dev', (req, res) => {
  const token = jwt.sign(
    { id: 1 },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  res.json({ token })
})

// Rutas
app.use('/api/clases-particulares', clasesParticularesRoutes)
app.use('/mis-turnos', turnos)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})