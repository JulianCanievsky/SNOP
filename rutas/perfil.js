import express from 'express'
import autenticar from '../src/middlewares/autenticar.js'
import supabase from '../src/config/db.js'

const router = express.Router()

// GET /api/perfil  — devuelve el perfil del usuario logueado
router.get('/', autenticar, async (req, res) => {
  try {
    const usuario_id = req.userId

    const { data: usuario, error: errorUsuario } = await supabase
      .from('users')
      .select('id, nombre, email, foto_url, cuota_al_dia, tipo_usuario_id, nivel_id, niveles(id, nombre)')
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
          duracion_min,
          mesa_id,
          sede_id,
          sedes ( nombre ),
          mesas ( numero ),
          users ( nombre )
        )
      `)
      .eq('user_id', usuario_id)
      .eq('estado', true)   // solo confirmados por el entrenador

    if (errorTurnos) throw errorTurnos

    res.json({
      data: {
        usuario: {
          ...usuario,
          nivel_nombre: usuario.niveles?.nombre ?? null,
        },
        turnos: inscripciones || []
      }
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener perfil' })
  }
})

export default router
