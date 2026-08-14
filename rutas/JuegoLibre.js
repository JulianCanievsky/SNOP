import express from 'express'
import autenticar from '../src/middlewares/autenticar.js'
import supabase from '../src/config/db.js'
import { crearNotificacion, enviarEmail, emailJuegoLibreLleno } from '../src/lib/notificaciones.js'

const router = express.Router()

// Alias para compatibilidad: el middleware pone req.userId
function adaptarSocioId(req, _res, next) {
  req.socio_id = req.userId
  next()
}

router.get('/', autenticar, adaptarSocioId, async (req, res) => {
  try {
    const { sede_id, fecha } = req.query
    const socioId = req.socio_id

    let query = supabase
      .from('juego_libre')
      .select('*, sedes ( nombre )')
      .eq('activo', true)
      .gte('fecha_fin', new Date().toISOString())
      .order('fecha_inicio', { ascending: true })

    if (sede_id) query = query.eq('sede_id', sede_id)
    if (fecha) {
      const desde = new Date(fecha)
      const hasta = new Date(fecha)
      hasta.setDate(hasta.getDate() + 1)
      query = query.gte('fecha_inicio', desde.toISOString()).lt('fecha_inicio', hasta.toISOString())
    }

    const { data: eventos, error } = await query
    if (error) throw error

    const { data: inscripciones, error: errorInsc } = await supabase
      .from('inscripciones_juego_libre')
      .select('evento_id, socio_id')
      .eq('estado', 'activo')

    if (errorInsc) throw errorInsc

    const socioIds = [...new Set(inscripciones.map((i) => i.socio_id))]
    let usuarios = []
    if (socioIds.length > 0) {
      const { data: usersData, error: errorUsers } = await supabase
        .from('users')
        .select('id, nombre, foto_url')
        .in('id', socioIds)
      if (errorUsers) throw errorUsers
      usuarios = usersData
    }

    const resultado = eventos.map((evento) => {
      const anotados = inscripciones.filter((i) => i.evento_id === evento.id)
      const yaInscripto = anotados.some((i) => i.socio_id === socioId)

      return {
        ...evento,
        inscriptos: anotados.length,
        nombre_sede: evento.sedes?.nombre ?? `Sede ${evento.sede_id}`,
        estado: anotados.length >= evento.capacidad_maxima ? 'completo' : 'abierto',
        ya_inscripto: yaInscripto,
        participantes: anotados.map((i) => {
          const user = usuarios.find((u) => u.id === i.socio_id)
          return { nombre: user?.nombre || '?', foto_url: user?.foto_url || null }
        }),
      }
    })

    res.json(resultado)
  } catch (error) {
    console.error('ERROR GET /api/juego-libre:', error)
    res.status(500).json({ error: 'Error al obtener juego libre' })
  }
})

router.post('/:id/inscribir', autenticar, adaptarSocioId, async (req, res) => {
  try {
    const eventoId = parseInt(req.params.id)
    const socioId = req.socio_id

    const { data: evento, error: errorEvento } = await supabase
      .from('juego_libre')
      .select('*')
      .eq('id', eventoId)
      .single()

    if (errorEvento || !evento) return res.status(404).json({ error: 'Evento no encontrado' })

    // Verificar ya inscripto
    const { data: yaInscripto } = await supabase
      .from('inscripciones_juego_libre')
      .select('id')
      .eq('evento_id', eventoId)
      .eq('socio_id', socioId)
      .eq('estado', 'activo')
      .maybeSingle()

    if (yaInscripto) return res.status(400).json({ error: 'Ya estás inscripto' })

    // Verificar capacidad
    const { count } = await supabase
      .from('inscripciones_juego_libre')
      .select('*', { count: 'exact', head: true })
      .eq('evento_id', eventoId)
      .eq('estado', 'activo')

    if (count >= evento.capacidad_maxima)
      return res.status(400).json({ error: 'El evento está completo' })

    // Insert con manejo de unique_violation para race condition
    const { error: errorInsc } = await supabase
      .from('inscripciones_juego_libre')
      .insert({ evento_id: eventoId, socio_id: socioId, estado: 'activo' })

    if (errorInsc) {
      if (errorInsc.code === '23505') {
        return res.status(400).json({ error: 'Ya estás inscripto' })
      }
      throw errorInsc
    }

    // Control post-insert contra race condition
    const { count: countFinal } = await supabase
      .from('inscripciones_juego_libre')
      .select('*', { count: 'exact', head: true })
      .eq('evento_id', eventoId)
      .eq('estado', 'activo')

    if (countFinal > evento.capacidad_maxima) {
      await supabase
        .from('inscripciones_juego_libre')
        .update({ estado: 'cancelado' })
        .eq('evento_id', eventoId)
        .eq('socio_id', socioId)
        .eq('estado', 'activo')
      return res.status(400).json({ error: 'El evento está completo' })
    }

    // Si se llenó el cupo, avisar a todos los admins
    if (countFinal >= evento.capacidad_maxima) {
      try {
        const { data: admins } = await supabase
          .from('users')
          .select('id, nombre, email')
          .eq('tipo_usuario_id', 3)
          .eq('activo', true)

        const { data: sedeData } = await supabase
          .from('sedes').select('nombre').eq('id', evento.sede_id).single()

        const fechaStr = new Date(evento.fecha_inicio).toLocaleString('es-AR', {
          weekday: 'long', day: 'numeric', month: 'long',
          hour: '2-digit', minute: '2-digit',
          timeZone: 'America/Argentina/Buenos_Aires',
        })
        const sedeStr = sedeData?.nombre ?? 'la sede'

        for (const admin of admins ?? []) {
          await crearNotificacion({
            user_id: admin.id,
            titulo:  'Juego libre completo',
            mensaje: `El espacio del ${fechaStr} en ${sedeStr} se llenó (${evento.capacidad_maxima}/${evento.capacidad_maxima}).`,
            tipo:    'juego_libre_lleno',
            link:    '/admin/juego-libre',
          })
          const tmpl = emailJuegoLibreLleno({
            adminNombre: admin.nombre,
            sede:        sedeStr,
            fechaEvento: fechaStr,
            capacidad:   evento.capacidad_maxima,
          })
          await enviarEmail({ to: admin.email, ...tmpl })
        }
      } catch (notifErr) {
        console.error('[juego-libre] notif lleno:', notifErr)
      }
    }

    res.json({ mensaje: 'Inscripción confirmada' })
  } catch (error) {
    console.error('ERROR POST /api/juego-libre/:id/inscribir:', error)
    res.status(500).json({ error: 'Error al inscribirse' })
  }
})

router.delete('/:id/cancelar', autenticar, adaptarSocioId, async (req, res) => {
  try {
    const eventoId = parseInt(req.params.id)
    const socioId = req.socio_id

    const { error } = await supabase
      .from('inscripciones_juego_libre')
      .update({ estado: 'cancelado' })
      .eq('evento_id', eventoId)
      .eq('socio_id', socioId)
      .eq('estado', 'activo')

    if (error) throw error

    res.json({ mensaje: 'Inscripción cancelada' })
  } catch (error) {
    console.error('ERROR DELETE /api/juego-libre/:id/cancelar:', error)
    res.status(500).json({ error: 'Error al cancelar' })
  }
})

export default router
