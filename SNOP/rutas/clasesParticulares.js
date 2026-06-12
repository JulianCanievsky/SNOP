const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.socio_id = decoded.id;
    next();
  } catch {
    res.status(403).json({ error: 'Token inválido' });
  }
};

// GET /clases-particulares/entrenadores
// Retorna entrenadores disponibles con sus turnos de tipo clase
router.get('/entrenadores', verificarToken, async (req, res) => {
  try {
    // Obtener usuarios que son entrenadores (tipo_usuario entrenador)
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
      .eq('activo', true);

    if (error) throw error;

    // Filtrar solo entrenadores
    const soloEntrenadores = entrenadores.filter(
      u => u.tipo_usuario?.nombre?.toLowerCase() === 'entrenador'
    );

    // Para cada entrenador, obtener sus turnos disponibles de tipo clase
    const entrenadoresConTurnos = await Promise.all(
      soloEntrenadores.map(async (entrenador) => {
        const { data: turnos } = await supabase
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
            tipo_turno_id,
            tipo_turno ( nombre )
          `)
          .eq('user_id', entrenador.id)
          .eq('estado', true)
          .gt('fecha_inicio', new Date().toISOString())
          .order('fecha_inicio', { ascending: true });

        // Filtrar turnos de tipo clase
        const turnosClase = (turnos || []).filter(
          t => t.tipo_turno?.nombre?.toLowerCase().includes('clase')
        );

        return {
          ...entrenador,
          tipo_usuario: entrenador.tipo_usuario?.nombre,
          turnos_disponibles: turnosClase.map(t => ({
            id: t.id,
            fecha_inicio: t.fecha_inicio,
            fecha_fin: t.fecha_fin,
            duracion_min: t.duracion_min,
            sede: t.sedes?.nombre,
            sede_id: t.sede_id,
          })),
        };
      })
    );

    // Solo entrenadores con al menos un turno disponible
    const conTurnos = entrenadoresConTurnos.filter(e => e.turnos_disponibles.length > 0);

    res.json({ data: conTurnos });
  } catch (error) {
    console.error('Error GET /entrenadores:', error);
    res.status(500).json({ error: 'Error al obtener entrenadores' });
  }
});

// GET /clases-particulares/entrenadores/:entrenadorId
// Retorna detalle de un entrenador con todos sus turnos
router.get('/entrenadores/:entrenadorId', verificarToken, async (req, res) => {
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
        tipo_usuario ( nombre )
      `)
      .eq('id', entrenadorId)
      .eq('activo', true)
      .single();

    if (error || !entrenador) {
      return res.status(404).json({ error: 'Entrenador no encontrado' });
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
        sedes ( nombre ),
        tipo_turno ( nombre )
      `)
      .eq('user_id', entrenadorId)
      .eq('estado', true)
      .gt('fecha_inicio', new Date().toISOString())
      .order('fecha_inicio', { ascending: true });

    const turnosClase = (turnos || []).filter(
      t => t.tipo_turno?.nombre?.toLowerCase().includes('clase')
    );

    res.json({
      data: {
        ...entrenador,
        tipo_usuario: entrenador.tipo_usuario?.nombre,
        turnos_disponibles: turnosClase.map(t => ({
          id: t.id,
          fecha_inicio: t.fecha_inicio,
          fecha_fin: t.fecha_fin,
          duracion_min: t.duracion_min,
          sede: t.sedes?.nombre,
          sede_id: t.sede_id,
        })),
      },
    });
  } catch (error) {
    console.error('Error GET /entrenadores/:id:', error);
    res.status(500).json({ error: 'Error al obtener entrenador' });
  }
});

// POST /clases-particulares/solicitar
// El socio envía una solicitud de clase a un entrenador
router.post('/solicitar', verificarToken, async (req, res) => {
  const socio_id = req.socio_id;
  const { entrenador_id, turno_id, mensaje } = req.body;

  if (!entrenador_id || !turno_id) {
    return res.status(400).json({ error: 'entrenador_id y turno_id son requeridos' });
  }

  try {
    // Verificar que el turno existe y está disponible
    const { data: turno, error: errorTurno } = await supabase
      .from('turnos')
      .select('*, tipo_turno ( nombre )')
      .eq('id', turno_id)
      .eq('user_id', entrenador_id)
      .eq('estado', true)
      .single();

    if (errorTurno || !turno) {
      return res.status(404).json({ error: 'Turno no disponible' });
    }

    // Verificar que no exista ya una solicitud activa para ese turno
    const { data: solicitudExistente } = await supabase
      .from('solicitudes_clase')
      .select('id')
      .eq('turno_id', turno_id)
      .eq('solicitante_id', socio_id)
      .neq('estado', false)
      .single();

    if (solicitudExistente) {
      return res.status(409).json({ error: 'Ya tenés una solicitud para este turno' });
    }

    // Crear la solicitud
    const { data: solicitud, error: errorSolicitud } = await supabase
      .from('solicitudes_clase')
      .insert({
        solicitante_id: socio_id,
        user_id: entrenador_id,
        turno_id,
        estado: false, // pendiente de aprobación
        mensaje: mensaje || null,
        fecha_propuesta: turno.fecha_inicio,
        duracion_min: turno.duracion_min,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (errorSolicitud) throw errorSolicitud;

    res.status(201).json({
      mensaje: 'Solicitud enviada correctamente. El entrenador la revisará pronto.',
      data: solicitud,
    });
  } catch (error) {
    console.error('Error POST /solicitar:', error);
    res.status(500).json({ error: 'Error al enviar la solicitud' });
  }
});

// GET /clases-particulares/mis-solicitudes
// El socio ve el estado de sus solicitudes
router.get('/mis-solicitudes', verificarToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('solicitudes_clase')
      .select(`
        id,
        estado,
        mensaje,
        mensaje_respuesta,
        fecha_propuesta,
        duracion_min,
        created_at,
        user_id,
        users!solicitudes_clase_user_id_fkey ( nombre, foto_url, rating ),
        turno_id,
        turnos ( fecha_inicio, fecha_fin, sedes ( nombre ) )
      `)
      .eq('solicitante_id', req.socio_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ data });
  } catch (error) {
    console.error('Error GET /mis-solicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
});

module.exports = router;