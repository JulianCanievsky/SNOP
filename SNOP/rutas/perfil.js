import { createClient } from '@supabase/supabase-js';
import express from 'express';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

router.get('/', async (req, res) => {
  try {
    const usuario_id = 9; // CAMBIAR PARA PROBAR OTRO USUARIO

    const { data: usuario, error: errorUsuario } = await supabase
      .from('users')
      .select('*')
      .eq('id', usuario_id)
      .single();

    if (errorUsuario) throw errorUsuario;

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
      .eq('user_id', usuario_id);

    if (errorTurnos) throw errorTurnos;

    res.json({
      data: {
        usuario,
        turnos: inscripciones || []
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Error al obtener perfil'
    });
  }
});

export default router;