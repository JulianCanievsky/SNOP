import express from 'express'
import autenticar from '../src/middlewares/autenticar.js'
import supabase from '../src/config/db.js'
import { parseFechaAR } from '../src/lib/fecha.js'

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
      return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' })
    }

    const { data: inscripciones, error: errorTurnos } = await supabase
      .from('socio_turno')
      .select(`
        turno_id,
        estado,
        estado_texto,
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
      .eq('estado', true)   // solo confirmados

    if (errorTurnos) throw errorTurnos

    // Separar próximos e historial en zona horaria Argentina
    const ahora = new Date()
    const proximos  = []
    const historial = []

    for (const insc of inscripciones ?? []) {
      const fechaFin = insc.turnos?.fecha_fin
        ? parseFechaAR(insc.turnos.fecha_fin)
        : insc.turnos?.fecha_inicio
          ? parseFechaAR(insc.turnos.fecha_inicio)
          : null

      if (!fechaFin || fechaFin >= ahora) {
        proximos.push(insc)
      } else {
        historial.push(insc)
      }
    }

    proximos.sort((a, b) =>
      new Date(a.turnos?.fecha_inicio ?? 0) - new Date(b.turnos?.fecha_inicio ?? 0)
    )
    historial.sort((a, b) =>
      new Date(b.turnos?.fecha_inicio ?? 0) - new Date(a.turnos?.fecha_inicio ?? 0)
    )

    res.json({
      ok: true,
      data: {
        usuario: {
          ...usuario,
          nivel_nombre: usuario.niveles?.nombre ?? null,
        },
        turnos:   proximos,   // compatibilidad: campo "turnos" = próximos
        historial,
      }
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ ok: false, mensaje: 'Error al obtener perfil' })
  }
})

export default router
