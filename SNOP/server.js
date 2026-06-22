process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import juegoLibreRoutes from './rutas/JuegoLibre.js'
import turnos from './rutas/turnos.js'
import clasesParticularesRoutes from './rutas/clasesParticulares.js'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/clases-particulares', clasesParticularesRoutes)
app.use('/api/juego-libre', juegoLibreRoutes)
app.use('/mis-turnos', turnos)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})