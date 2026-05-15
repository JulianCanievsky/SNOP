import supabase from "../config/db.js";

// Obtener turnos de un socio
export async function getTurnosBySocio(socioId) {

  const { data, error } = await supabase
    .from("SOCIO_TURNO")
    .select(`
      id,
      estado,
      fecha_inscripcion,

      TURNOS (
        id,
        fecha_inicio,
        fecha_fin,
        duracion_min,

        TIPO_TURNO (
          nombre
        ),

        SEDES (
          nombre,
          direccion
        ),

        MESAS (
          numero
        ),

        USERS (
          nombre
        ),

        NIVELES (
          nombre
        )
      )
    `)
    .eq("user_id", socioId)
    .order("fecha_inscripcion", {
      ascending: true
    });

  if (error) {
    throw error;
  }

  return data;
}

// Cancelar turno
export async function cancelarTurno(
  turnoId,
  socioId
) {

  const { data, error } = await supabase
    .from("SOCIO_TURNO")
    .update({
      estado: false
    })
    .eq("turno_id", turnoId)
    .eq("user_id", socioId)
    .select();

  if (error) {
    throw error;
  }

  return data;
}