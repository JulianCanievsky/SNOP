process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
import juegoLibreRoutes from './rutas/JuegoLibre.js'
import turnos from './rutas/turnos.js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

app.post('/auth/login-dev', async (req, res) => {
  const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET)
  res.json({ token })
})

app.use('/juego-libre', juegoLibreRoutes)
app.use('/api/turnos', turnos)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})
