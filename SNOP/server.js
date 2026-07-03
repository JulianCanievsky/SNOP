process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

import juegoLibreRoutes         from './rutas/JuegoLibre.js'
import turnosRoutes             from './rutas/turnos.js'
import clasesParticularesRoutes from './rutas/clasesParticulares.js'
import perfilRouter             from './rutas/perfil.js'
import authRouter               from './rutas/auth.js'
import adminRouter              from './rutas/admin.js'

dotenv.config()

const app = express()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

app.use(cors())
app.use(express.json())

app.use('/api/auth',                authRouter)
app.use('/api/admin',               adminRouter)

// Sedes públicas — sin auth, para socios
app.get('/api/sedes', async (_req, res) => {
  const { data, error } = await supabase.from('sedes').select('id, nombre').order('nombre')
  if (error) return res.status(500).json({ error: 'Error al obtener sedes' })
  res.json({ data: data ?? [] })
})

app.use('/juego-libre',             juegoLibreRoutes)
app.use('/api/juego-libre',         juegoLibreRoutes)
app.use('/api/turnos',              turnosRoutes)
app.use('/api/clases-particulares', clasesParticularesRoutes)
app.use('/api/perfil',              perfilRouter)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})
