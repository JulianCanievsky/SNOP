import supabase from "../config/db.js";

// Obtener turnos de un socio
export async function getTurnosBySocio(socioId) {

  const { data, error } = await supabase
    .from("socio_turno")
    .select(`
      id,
      estado,
      fecha_inscripcion,

      turnos (
        id,
        fecha_inicio,
        fecha_fin,
        duracion_min,

        tipo_turno (
          nombre
        ),

        sedes (
          nombre,
          direccion
        ),

        mesas (
          numero
        ),

        users (
          nombre
        )
      )
    `)
    .eq("user_id", socioId)
    .order("fecha_inscripcion", {
      ascending: true
    });

  if (error) {

    console.error("ERROR OBTENER TURNOS:");
    console.error(error);

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
    .from("socio_turno")
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