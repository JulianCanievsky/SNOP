import supabase from "../config/db.js";
import { crearNotificacion, enviarEmail, emailListaEsperaPromovido } from "../lib/notificaciones.js";

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
        dia_semana,
        hora_inicio,
        hora_fin,
        recurrente,
        tipo_turno (nombre),
        sedes (nombre, direccion),
        mesas (numero),
        users (nombre)
      )
    `)
    .eq("user_id", socioId)
    .eq("estado", true)
    .order("fecha_inscripcion", { ascending: true });

  if (error) {
    console.error("getTurnosBySocio:", error);
    throw error;
  }
  return data;
}

export async function cancelarTurno(turnoId, socioId) {
  // 1. Cancelar inscripción
  const { data, error } = await supabase
    .from("socio_turno")
    .update({ estado: false })
    .eq("turno_id", turnoId)
    .eq("user_id", socioId)
    .select();

  if (error) throw error;

  // 2. Promover al primero en lista de espera (si existe)
  try {
    await promoverPrimeroEnEspera(turnoId);
  } catch (promErr) {
    // No bloquear la cancelación si falla la promoción
    console.error("[lista-espera] Error al promover:", promErr);
  }

  return data;
}

export async function reconfirmarTurno(turnoId, socioId) {
  const { data, error } = await supabase
    .from("socio_turno")
    .update({ estado: true })
    .eq("turno_id", turnoId)
    .eq("user_id", socioId)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Promueve automáticamente al primero de la lista de espera cuando se libera un cupo.
 * - Verifica que el turno realmente tenga cupo antes de promover.
 * - Actualiza lista_espera_turno estado → 'promovido'.
 * - Inserta en socio_turno con estado = true.
 * - Envía notificación in-app y email al socio promovido.
 * - Reordena las posiciones restantes.
 */
export async function promoverPrimeroEnEspera(turnoId) {
  // Obtener estado actual del turno
  const { data: turno } = await supabase
    .from("turnos")
    .select("id, capacidad_maxima, dia_semana, hora_inicio, sedes(nombre), socio_turno(id, estado)")
    .eq("id", turnoId)
    .single();

  if (!turno) return;

  const inscriptosActivos = (turno.socio_turno ?? []).filter(s => s.estado === true).length;
  if (inscriptosActivos >= turno.capacidad_maxima) return; // sigue lleno

  // Primer candidato en lista de espera
  const { data: candidatos } = await supabase
    .from("lista_espera_turno")
    .select("id, user_id, posicion")
    .eq("turno_id", turnoId)
    .eq("estado", "esperando")
    .order("posicion", { ascending: true })
    .limit(1);

  if (!candidatos?.length) return; // lista vacía

  const candidato = candidatos[0];

  // Insertar en socio_turno
  const { error: errInsc } = await supabase
    .from("socio_turno")
    .insert({
      user_id:           candidato.user_id,
      turno_id:          turnoId,
      estado:            true,
      fecha_inscripcion: new Date().toISOString(),
    });

  if (errInsc) {
    if (errInsc.code === "23505") {
      // Ya estaba inscripto (rara condición); actualizar estado igualmente
      await supabase
        .from("socio_turno")
        .update({ estado: true })
        .eq("user_id", candidato.user_id)
        .eq("turno_id", turnoId);
    } else {
      throw errInsc;
    }
  }

  // Marcar como promovido en lista de espera
  await supabase
    .from("lista_espera_turno")
    .update({ estado: "promovido" })
    .eq("id", candidato.id);

  // Reordenar posiciones de los que siguen esperando
  const { data: restantes } = await supabase
    .from("lista_espera_turno")
    .select("id")
    .eq("turno_id", turnoId)
    .eq("estado", "esperando")
    .order("posicion", { ascending: true });

  for (let i = 0; i < (restantes ?? []).length; i++) {
    await supabase
      .from("lista_espera_turno")
      .update({ posicion: i + 1 })
      .eq("id", restantes[i].id);
  }

  // Notificación al socio promovido
  try {
    const { data: socio } = await supabase
      .from("users")
      .select("nombre, email")
      .eq("id", candidato.user_id)
      .single();

    const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    const diaStr  = DIAS[turno.dia_semana] ?? `día ${turno.dia_semana}`;
    const horaStr = turno.hora_inicio?.slice(0, 5) ?? "";
    const sedeStr = turno.sedes?.nombre ?? "la sede";
    const fechaStr = `${diaStr}s a las ${horaStr} hs`;

    if (socio) {
      await crearNotificacion({
        user_id: candidato.user_id,
        titulo:  "¡Conseguiste un lugar!",
        mensaje: `Se liberó un cupo en el turno del ${fechaStr} en ${sedeStr}. Ya estás inscripto.`,
        tipo:    "lista_espera_promovido",
        link:    "/mis-clases",
      });

      const tmpl = emailListaEsperaPromovido({ nombre: socio.nombre, fechaTurno: fechaStr, sede: sedeStr });
      await enviarEmail({ to: socio.email, ...tmpl });
    }
  } catch (notifErr) {
    console.error("[lista-espera] Error al notificar promoción:", notifErr);
  }
}
