import { createClient } from '@supabase/supabase-js';
import express from 'express';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// =========================
// GET ENTRENADORES
// =========================
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
      .eq('tipo_usuario_id', 2); // SOLO ENTRENADORES

    if (error) throw error;

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
          .order('fecha_inicio', { ascending: true });

        if (errorTurnos) {
          console.log(errorTurnos);
        }

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
        };
      })
    );

    res.json({
      data: entrenadoresConTurnos,
    });
  } catch (error) {
    console.error('ERROR GET /entrenadores', error);
    res.status(500).json({
      error: 'Error al obtener entrenadores',
    });
  }
});

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
      .order('fecha_inicio', { ascending: true });

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

// =========================
// POST SOLICITAR
// =========================
// =========================
// POST SOLICITAR
// =========================
router.post('/solicitar', async (req, res) => {

  const socio_id = 7;
  const { turno_id } = req.body;

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

// =========================
// MIS SOLICITUDES
// =========================
// =========================
// MIS SOLICITUDES
// =========================
router.get('/mis-solicitudes', async (req, res) => {

  try {

    const socio_id = 7;

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