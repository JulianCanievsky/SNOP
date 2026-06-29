import { createClient } from '@supabase/supabase-js'
import express from 'express'
import autenticar from '../src/middlewares/autenticar.js'

const router = express.Router()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// GET ENTRENADORES
router.get('/entrenadores', async (req, res) => {
  try {
    const { data: entrenadores, error } = await supabase
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
      .eq('activo', true)
      .eq('tipo_usuario_id', 2)

    if (error) throw error

    // Inicio del día de hoy para no excluir turnos de hoy que aún no pasaron
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const desdeHoy = hoy.toISOString()

    const entrenadoresConTurnos = await Promise.all(
      entrenadores.map(async (entrenador) => {
        const { data: turnos, error: errorTurnos } = await supabase
          .from('turnos')
          .select(`
            id,
            fecha_inicio,
            fecha_fin,
            duracion_min,
            estado,
            capacidad_maxima,
            sede_id,
            sedes ( nombre ),
            tipo_turno_id
          `)
          .eq('user_id', entrenador.id)
          .gte('fecha_inicio', desdeHoy)       // solo turnos de hoy en adelante
          .order('fecha_inicio', { ascending: true })

        if (errorTurnos) console.log(errorTurnos)

        return {
          ...entrenador,
          tipo_usuario: entrenador.tipo_usuario?.nombre,
          turnos_disponibles: (turnos || []).map((t) => ({
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
    )

    // Filtra entrenadores que tengan al menos un turno disponible
    const conTurnos = entrenadoresConTurnos.filter(e => e.turnos_disponibles.length > 0)

    res.json({ data: conTurnos })
  } catch (error) {
    console.error('ERROR GET /entrenadores', error)
    res.status(500).json({ error: 'Error al obtener entrenadores' })
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

    const hoyDet = new Date()
    hoyDet.setHours(0, 0, 0, 0)

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

    res.json({
      data: {
        ...entrenador,
        tipo_usuario: entrenador.tipo_usuario?.nombre,
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

  try {

    // Verifica si ya solicitó ese turno
    const { data: existe, error: errorExiste } = await supabase
      .from('socio_turno')
      .select('id')
      .eq('user_id', socio_id)
      .eq('turno_id', turno_id)
      .maybeSingle();

    if (errorExiste) throw errorExiste;

    if (existe) {
      return res.status(409).json({
        error: 'Ya solicitaste este turno.'
      });
    }

    // Inserta la solicitud como pendiente
    const { data, error } = await supabase
      .from('socio_turno')
     .insert({
  turno_id,
  user_id: socio_id,
  estado: false,
  fecha_inscripcion: new Date().toISOString()
})
      .select();

    if (error) throw error;

    res.status(201).json({
      mensaje: 'Solicitud enviada correctamente.',
      data
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: 'Error al enviar la solicitud.'
    });
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