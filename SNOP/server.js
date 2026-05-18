import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import juegoLibreRoutes from './rutas/JuegoLibre.js'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

app.use('/juego-libre', juegoLibreRoutes)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})