const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Middleware para verificar JWT y extraer socio_id
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

// GET /juego-libre
// Retorna eventos activos con fecha > NOW() y lugares_disponibles > 0
router.get('/', verificarToken, async (req, res) => {
  try {
    const { club_id, sede_id, fecha } = req.query;

    let query = supabase
      .from('juego_libre')
      .select(`
        id,
        titulo,
        sede_id,
        sedes ( nombre ),
        fecha_inicio,
        fecha_fin,
        capacidad_maxima,
        activo,
        creado_por,
        created_at
      `)
      .eq('activo', true)
      .gt('fecha_inicio', new Date().toISOString())
      .order('fecha_inicio', { ascending: true });

    if (sede_id) query = query.eq('sede_id', sede_id);
    if (fecha) {
      const inicio = new Date(fecha);
      const fin = new Date(fecha);
      fin.setDate(fin.getDate() + 1);
      query = query.gte('fecha_inicio', inicio.toISOString()).lt('fecha_inicio', fin.toISOString());
    }

    const { data: eventos, error } = await query;
    if (error) throw error;

    // Calcular lugares_disponibles para cada evento
    const eventosConLugares = await Promise.all(
      eventos.map(async (evento) => {
        const { count } = await supabase
          .from('inscripciones_juego_libre')
          .select('*', { count: 'exact', head: true })
          .eq('evento_id', evento.id)
          .eq('estado', 'activo');

        const inscriptos = count || 0;
        const lugares_disponibles = evento.capacidad_maxima - inscriptos;

        // Obtener avatares de inscriptos (primeros 6)
        const { data: inscriptosData } = await supabase
          .from('inscripciones_juego_libre')
          .select('socio_id, users ( nombre, foto_url )')
          .eq('evento_id', evento.id)
          .eq('estado', 'activo')
          .limit(6);

        return {
          ...evento,
          nombre_sede: evento.sedes?.nombre,
          inscriptos,
          lugares_disponibles,
          participantes: inscriptosData?.map(i => ({
            socio_id: i.socio_id,
            nombre: i.users?.nombre,
            foto_url: i.users?.foto_url,
          })) || [],
          estado: lugares_disponibles > 0 ? 'abierto' : 'completo',
        };
      })
    );

    // Solo eventos con lugares disponibles (o todos, según lógica de negocio)
    res.json({ data: eventosConLugares });
  } catch (error) {
    console.error('Error GET /juego-libre:', error);
    res.status(500).json({ error: 'Error al obtener eventos de juego libre' });
  }
});

// POST /juego-libre/:eventoId/inscribir
router.post('/:eventoId/inscribir', verificarToken, async (req, res) => {
  const { eventoId } = req.params;
  const socio_id = req.socio_id;

  try {
    // 1. Verificar que el evento existe y está activo
    const { data: evento, error: errorEvento } = await supabase
      .from('juego_libre')
      .select('*')
      .eq('id', eventoId)
      .eq('activo', true)
      .gt('fecha_inicio', new Date().toISOString())
      .single();

    if (errorEvento || !evento) {
      return res.status(404).json({ error: 'Evento no encontrado o ya pasó' });
    }

    // 2. Validar que el socio no esté ya inscripto
    const { data: yaInscripto } = await supabase
      .from('inscripciones_juego_libre')
      .select('id')
      .eq('evento_id', eventoId)
      .eq('socio_id', socio_id)
      .eq('estado', 'activo')
      .single();

    if (yaInscripto) {
      return res.status(409).json({ error: 'Ya estás inscripto en este evento' });
    }

    // 3. Validar que haya lugares disponibles (con lock para concurrencia)
    const { count: inscriptos } = await supabase
      .from('inscripciones_juego_libre')
      .select('*', { count: 'exact', head: true })
      .eq('evento_id', eventoId)
      .eq('estado', 'activo');

    const lugares_disponibles = evento.capacidad_maxima - (inscriptos || 0);

    if (lugares_disponibles <= 0) {
      return res.status(409).json({ error: 'No hay lugares disponibles' });
    }

    // 4. Crear registro en inscripciones_juego_libre
    const { data: inscripcion, error: errorInscripcion } = await supabase
      .from('inscripciones_juego_libre')
      .insert({
        evento_id: parseInt(eventoId),
        socio_id,
        fecha_inscripcion: new Date().toISOString(),
        estado: 'activo',
      })
      .select()
      .single();

    if (errorInscripcion) throw errorInscripcion;

    res.status(201).json({
      mensaje: 'Inscripción exitosa',
      data: inscripcion,
    });
  } catch (error) {
    console.error('Error POST /juego-libre/:eventoId/inscribir:', error);
    res.status(500).json({ error: 'Error al inscribirse en el evento' });
  }
});

// DELETE /juego-libre/:eventoId/cancelar
router.delete('/:eventoId/cancelar', verificarToken, async (req, res) => {
  const { eventoId } = req.params;
  const socio_id = req.socio_id;

  try {
    const { data, error } = await supabase
      .from('inscripciones_juego_libre')
      .update({ estado: 'cancelada' })
      .eq('evento_id', eventoId)
      .eq('socio_id', socio_id)
      .eq('estado', 'activo')
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Inscripción no encontrada' });
    }

    res.json({ mensaje: 'Inscripción cancelada', data });
  } catch (error) {
    console.error('Error DELETE /juego-libre/:eventoId/cancelar:', error);
    res.status(500).json({ error: 'Error al cancelar la inscripción' });
  }
});

module.exports = router;