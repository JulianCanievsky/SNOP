process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import juegoLibreRoutes         from './rutas/JuegoLibre.js'
import turnosRoutes             from './rutas/turnos.js'
import clasesParticularesRoutes from './rutas/clasesParticulares.js'
import perfilRouter             from './rutas/perfil.js'
import authRouter               from './rutas/auth.js'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth',                authRouter)
app.use('/juego-libre',             juegoLibreRoutes)
app.use('/api/juego-libre',         juegoLibreRoutes)
app.use('/api/turnos',              turnosRoutes)
app.use('/api/clases-particulares', clasesParticularesRoutes)
app.use('/api/perfil',              perfilRouter)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})
