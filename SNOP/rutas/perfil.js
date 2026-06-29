import { createClient } from '@supabase/supabase-js'
import express from 'express'
import autenticar from '../src/middlewares/autenticar.js'

const router = express.Router()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// GET /api/perfil  — devuelve el perfil del usuario logueado
router.get('/', autenticar, async (req, res) => {
  try {
    const usuario_id = req.userId

    const { data: usuario, error: errorUsuario } = await supabase
      .from('users')
      .select('id, nombre, email, foto_url, cuota_al_dia, tipo_usuario_id')
      .eq('id', usuario_id)
      .single()

    if (errorUsuario || !usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const { data: inscripciones, error: errorTurnos } = await supabase
      .from('socio_turno')
      .select(`
        turno_id,
        estado,
        turnos (
          id,
          fecha_inicio,
          fecha_fin,
          mesa_id,
          sede_id
        )
      `)
      .eq('user_id', usuario_id)

    if (errorTurnos) throw errorTurnos

    res.json({
      data: {
        usuario,
        turnos: inscripciones || []
      }
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener perfil' })
  }
})

export default router
