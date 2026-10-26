import express from 'express'
import autenticar from '../src/middlewares/autenticar.js'
import supabase from '../src/config/db.js'
import { crearNotificacion, enviarEmail, emailNuevaSolicitudClase } from '../src/lib/notificaciones.js'
import { crearInscripcion } from '../src/services/socioTurnoService.js'

const router = express.Router()

// GET ENTRENADORES — una sola query con join, elimina N+1
router.get('/entrenadores', async (req, res) => {
  try {
    const hoyAR = new Date().toLocaleString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).slice(0, 10)
    const desdeHoy = new Date(`${hoyAR}T00:00:00-03:00`).toISOString()

    // Query única: entrenadores + turnos + ratings en paralelo
    const [entrenadoresRes, turnosRes, ratingsRes] = await Promise.all([
      supabase
        .from('users')
        .select('id, nombre, foto_url, rating, clases_dadas, tipo_usuario_id, tipo_usuario(nombre)')
        .eq('activo', true)
        .eq('tipo_usuario_id', 2),
      supabase
        .from('turnos')
        .select('id, user_id, fecha_inicio, fecha_fin, duracion_min, estado, sede_id, sedes(nombre)')
        .eq('tipo_turno_id', 2)  // solo clases particulares
        .gte('fecha_inicio', desdeHoy)
        .order('fecha_inicio', { ascending: true }),
      supabase
        .from('ratings_entrenador')
        .select('entrenador_id')
    ])

    if (entrenadoresRes.error) throw entrenadoresRes.error

    // Agrupar turnos y ratings por entrenador
    const turnosPorEntrenador = {}
    for (const t of turnosRes.data ?? []) {
      if (!turnosPorEntrenador[t.user_id]) turnosPorEntrenador[t.user_id] = []
      turnosPorEntrenador[t.user_id].push(t)
    }
    const ratingsPorEntrenador = {}
    for (const r of ratingsRes.data ?? []) {
      ratingsPorEntrenador[r.entrenador_id] = (ratingsPorEntrenador[r.entrenador_id] ?? 0) + 1
    }

    const resultado = (entrenadoresRes.data ?? [])
      .map(entrenador => {
        const turnos = turnosPorEntrenador[entrenador.id] ?? []
        return {
          ...entrenador,
          tipo_usuario: entrenador.tipo_usuario?.nombre,
          total_ratings: ratingsPorEntrenador[entrenador.id] ?? 0,
          turnos_disponibles: turnos.map(t => ({
            id: t.id,
            fecha_inicio: t.fecha_inicio,
            fecha_fin: t.fecha_fin,
            duracion_min: t.duracion_min,
            estado: t.estado,
            sede: t.sedes?.nombre,
            sede_id: t.sede_id,
          })),
        }
      })
      .filter(e => e.turnos_disponibles.length > 0)

    res.json({ ok: true, data: resultado })
  } catch (error) {
    console.error('ERROR GET /entrenadores', error)
    res.status(500).json({ ok: false, mensaje: 'Error al obtener entrenadores' })
  }
})

// =========================
// GET ENTRENADOR
// =========================
router.get('/entrenadores/:entrenadorId', async (req, res) => {
  try {
    const { entrenadorId } = req.params;

    const { data: entrenador, error } = await supabase
      .from('users')
      .select(`
        id,
        nombre,
        foto_url,
        rating,
        clases_dadas,
        tipo_usuario_id,
        tipo_usuario ( nombre )
      `)
      .eq('id', entrenadorId)
      .eq('tipo_usuario_id', 2)
      .single();

    if (error || !entrenador) {
      return res.status(404).json({
        error: 'Entrenador no encontrado',
      });
    }

    const hoyDetAR = new Date().toLocaleString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).slice(0, 10)
    const hoyDet   = new Date(`${hoyDetAR}T00:00:00-03:00`)

    const { data: turnos } = await supabase
      .from('turnos')
      .select(`
        id,
        fecha_inicio,
        fecha_fin,
        duracion_min,
        estado,
        sede_id,
        sedes ( nombre )
      `)
      .eq('user_id', entrenadorId)
      .gte('fecha_inicio', hoyDet.toISOString())
      .order('fecha_inicio', { ascending: true })

    const { count: totalRatings } = await supabase
      .from('ratings_entrenador')
      .select('id', { count: 'exact', head: true })
      .eq('entrenador_id', entrenadorId)

    res.json({
      data: {
        ...entrenador,
        tipo_usuario:  entrenador.tipo_usuario?.nombre,
        total_ratings: totalRatings ?? 0,
        turnos_disponibles: (turnos || []).map((t) => ({
          id: t.id,
          fecha_inicio: t.fecha_inicio,
          fecha_fin: t.fecha_fin,
          duracion_min: t.duracion_min,
          estado: t.estado,
          sede: t.sedes?.nombre,
          sede_id: t.sede_id,
        })),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Error al obtener entrenador',
    });
  }
});

// POST SOLICITAR
router.post('/solicitar', autenticar, async (req, res) => {
  const socio_id = req.userId
  const { turno_id } = req.body

  if (!turno_id) {
    return res.status(400).json({ ok: false, mensaje: 'turno_id es requerido' })
  }

  try {
    // 1. Validar que el turno existe y es de tipo particular (tipo_turno_id = 2)
    const { data: turnoData, error: errTurno } = await supabase
      .from('turnos')
      .select('id, tipo_turno_id, estado, capacidad_maxima, user_id, sedes(nombre), users!turnos_user_id_fkey(id, nombre, email), socio_turno(id, estado, user_id)')
      .eq('id', turno_id)
      .single()

    if (errTurno || !turnoData) {
      return res.status(404).json({ ok: false, mensaje: 'Turno no encontrado' })
    }
    if (turnoData.tipo_turno_id !== 2) {
      return res.status(400).json({ ok: false, mensaje: 'Solo se pueden solicitar clases particulares desde aquí' })
    }
    if (!turnoData.estado) {
      return res.status(400).json({ ok: false, mensaje: 'Este turno no está disponible' })
    }

    // 2. No puede solicitar a sí mismo (si el socio es también entrenador del turno)
    if (turnoData.user_id === socio_id) {
      return res.status(400).json({ ok: false, mensaje: 'No podés solicitar tu propio turno' })
    }

    // 3. Verificar cupo
    const inscriptosActivos = (turnoData.socio_turno ?? []).filter(s => s.estado === true).length
    if (inscriptosActivos >= (turnoData.capacidad_maxima ?? 1)) {
      return res.status(400).json({ ok: false, mensaje: 'El turno no tiene cupo disponible' })
    }

    // 4. Verificar duplicado
    const yaSolicito = (turnoData.socio_turno ?? []).some(s => s.user_id === socio_id)
    if (yaSolicito) {
      return res.status(409).json({ ok: false, mensaje: 'Ya solicitaste este turno' })
    }

    // 5. Insertar solicitud pendiente (vía socioTurnoService → siempre escribe estado_texto)
    const inscripcion = await crearInscripcion({
      turno_id,
      user_id:       socio_id,
      estado_texto:  'pendiente',
    })

    // 6. Notificar al entrenador
    try {
      const { data: socioData } = await supabase
        .from('users').select('nombre').eq('id', socio_id).single()

      if (turnoData.users && socioData) {
        const fechaStr = turnoData.fecha_inicio
          ? new Date(turnoData.fecha_inicio).toLocaleString('es-AR', {
              weekday: 'long', day: 'numeric', month: 'long',
              hour: '2-digit', minute: '2-digit',
              timeZone: 'America/Argentina/Buenos_Aires',
            })
          : 'próximamente'
        const sedeStr = turnoData.sedes?.nombre ?? 'la sede'
        await crearNotificacion({
          user_id: turnoData.users.id,
          titulo:  'Nueva solicitud de clase',
          mensaje: `${socioData.nombre} solicitó una clase para el ${fechaStr} en ${sedeStr}.`,
          tipo:    'solicitud_clase',
          link:    '/entrenador/solicitudes',
        })
        const tmpl = emailNuevaSolicitudClase({
          entrenadorNombre: turnoData.users.nombre,
          socioNombre:      socioData.nombre,
          fechaTurno:       fechaStr,
          sede:             sedeStr,
        })
        await enviarEmail({ to: turnoData.users.email, ...tmpl })
      }
    } catch (notifErr) {
      console.error('[clasesParticulares] notif nueva solicitud:', notifErr)
    }

    res.status(201).json({ ok: true, mensaje: 'Solicitud enviada correctamente', data: inscripcion })

  } catch (error) {
    console.error('[clasesParticulares POST /solicitar]', error)
    if (error.code === '23505') {
      return res.status(409).json({ ok: false, mensaje: 'Ya solicitaste este turno' })
    }
    res.status(500).json({ ok: false, mensaje: 'Error al enviar la solicitud' })
  }
});

// DELETE LIBERAR TURNO
router.delete('/liberar/:id', autenticar, async (req, res) => {
  const socio_id = req.userId
  const { id } = req.params

  try {

    const { error } = await supabase
      .from('socio_turno')
      .delete()
      .eq('id', id)
      .eq('user_id', socio_id);

    if (error) throw error;

    res.json({
      mensaje: 'Solicitud cancelada.'
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: 'No se pudo liberar el turno.'
    });

  }
  

});

// MIS SOLICITUDES
router.get('/mis-solicitudes', autenticar, async (req, res) => {
  try {
    const socio_id = req.userId

   const { data, error } = await supabase
  .from('socio_turno')
  .select(`
    id,
    turno_id,
    estado,
    fecha_inscripcion,
    turnos!inner(
      id,
      fecha_inicio,
      fecha_fin,
      duracion_min,
      tipo_turno_id,
      users(
        nombre
      ),
      sedes(
        nombre
      )
    )
  `)
  .eq('user_id', socio_id)
  .eq('turnos.tipo_turno_id', 2) // SOLO clases particulares
  .order('fecha_inscripcion', { ascending: false });
    if (error) throw error;

    res.json({
      data
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: 'Error al obtener las solicitudes.'
    });

  }

});
export default router;