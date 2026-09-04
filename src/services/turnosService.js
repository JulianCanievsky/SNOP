import supabase from "../config/db.js";
import { crearNotificacion, enviarEmail } from "../lib/notificaciones.js";

// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
export async function cancelarTurno(turnoId, socioId) {
  // 1. Verificar el turno antes de cancelar (para saber si estaba lleno)
  const { data: turno } = await supabase
    .from("turnos")
    .select("id, capacidad_maxima, dia_semana, hora_inicio, sedes(nombre), socio_turno(id, estado)")
    .eq("id", turnoId)
    .single();

  const inscriptosAntes = turno
    ? (turno.socio_turno ?? []).filter(s => s.estado === true).length
    : 0;
  const estabaTurnoLleno = turno
    ? inscriptosAntes >= (turno.capacidad_maxima ?? 0)
    : false;

  // 2. Cancelar la inscripción
  const { data, error } = await supabase
    .from("socio_turno")
    .update({ estado: false })
    .eq("turno_id", turnoId)
    .eq("user_id", socioId)
    .select();

  if (error) throw error;

  // 3. Si el turno estaba lleno, avisar a todos los demás inscriptos que hay lugar
  if (estabaTurnoLleno && turno) {
    try {
      await notificarLugarDisponible(turno, socioId);
    } catch (notifErr) {
      console.error("[cancelarTurno] Error al notificar lugar disponible:", notifErr);
    }
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Envía una notificación + email a todos los socios que NO están inscriptos
 * en el turno avisando que se liberó un cupo.
 * Para no spamear a toda la base, notificamos a socios con inscripción cancelada
 * en ese mismo turno (que en algún momento intentaron anotarse).
 * Si no hay ninguno, el aviso queda solo en el sistema de notificaciones.
 */
async function notificarLugarDisponible(turno, socioQueCancelo) {
  const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const diaStr  = turno.dia_semana != null ? DIAS[turno.dia_semana] : null;
  const horaStr = turno.hora_inicio?.slice(0, 5) ?? "";
  const sedeStr = turno.sedes?.nombre ?? "la sede";

  const fechaStr = diaStr
    ? `${diaStr}s a las ${horaStr} hs`
    : (turno.fecha_inicio
        ? new Date(turno.fecha_inicio).toLocaleString("es-AR", {
            weekday: "long", day: "numeric", month: "long",
            hour: "2-digit", minute: "2-digit",
            timeZone: "America/Argentina/Buenos_Aires",
          })
        : "próximamente");

  // Socios con inscripción cancelada en este turno (excluyendo quien acaba de cancelar)
  const { data: cancelados } = await supabase
    .from("socio_turno")
    .select("user_id, users!socio_turno_user_id_fkey(id, nombre, email)")
    .eq("turno_id", turno.id)
    .eq("estado", false)
    .neq("user_id", socioQueCancelo);

  const destinatarios = (cancelados ?? []).map(c => c.users).filter(Boolean);

  for (const socio of destinatarios) {
    await crearNotificacion({
      user_id: socio.id,
      titulo:  "Se liberó un lugar",
      mensaje: `Se liberó un cupo en el turno del ${fechaStr} en ${sedeStr}. Anotate antes de que se llene.`,
      tipo:    "lugar_disponible",
      link:    "/mis-clases",
    });

    await enviarEmail({
      to:      socio.email,
      subject: "Se liberó un lugar en tu turno — SNOP",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8f9fc;border-radius:12px;">
          <h2 style="color:#2563eb;margin:0 0 8px;">Se liberó un lugar</h2>
          <p style="color:#555;margin:0 0 16px;">Hola <strong>${socio.nombre}</strong>, se liberó un cupo en el siguiente turno:</p>
          <div style="background:#eef2ff;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
            <p style="margin:0 0 4px;font-weight:700;color:#1e293b;">${fechaStr}</p>
            <p style="margin:0;color:#64748b;font-size:13px;">📍 ${sedeStr}</p>
          </div>
          <p style="color:#555;margin:0 0 20px;font-size:14px;">Anotate antes de que se llene.</p>
          <a href="${process.env.FRONTEND_URL || "https://snop-psi.vercel.app"}/mis-clases"
             style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:28px;text-decoration:none;font-weight:700;font-size:14px;">
            Ver mis clases
          </a>
        </div>
      `,
    });
  }

  if (destinatarios.length > 0) {
    console.log(`[lugarDisponible] Notificado a ${destinatarios.length} socio(s) del turno ${turno.id}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export async function reconfirmarTurno(turnoId, socioId) {
  // 1. Obtener datos del turno: capacidad, niveles habilitados e inscriptos actuales
  const { data: turno, error: errTurno } = await supabase
    .from("turnos")
    .select("id, capacidad_maxima, nivel_minimo_id, nivel_maximo_id, socio_turno(id, estado)")
    .eq("id", turnoId)
    .single();

  if (errTurno || !turno) throw new Error("Turno no encontrado");

  // 2. Verificar cupo disponible (sin contar la fila del propio socio, que ya existe con estado=false)
  const inscriptosActivos = (turno.socio_turno ?? []).filter(
    (s) => s.estado === true
  ).length;
  if (inscriptosActivos >= (turno.capacidad_maxima ?? 0)) {
    throw new Error("El turno ya está completo. No hay cupo disponible.");
  }

  // 3. Verificar que el nivel del socio está dentro del rango permitido
  if (turno.nivel_minimo_id != null || turno.nivel_maximo_id != null) {
    const { data: socio, error: errSocio } = await supabase
      .from("users")
      .select("nivel_id")
      .eq("id", socioId)
      .single();

    if (!errSocio && socio?.nivel_id != null) {
      // Obtener el orden/posición de cada nivel para comparar rangos
      const { data: niveles } = await supabase
        .from("niveles")
        .select("id, orden")
        .order("orden", { ascending: true });

      const nivelMap = Object.fromEntries((niveles ?? []).map((n) => [n.id, n.orden]));
      const ordenSocio = nivelMap[socio.nivel_id] ?? 0;
      const ordenMin   = turno.nivel_minimo_id != null ? (nivelMap[turno.nivel_minimo_id] ?? 0) : null;
      const ordenMax   = turno.nivel_maximo_id != null ? (nivelMap[turno.nivel_maximo_id] ?? Infinity) : null;

      if (ordenMin != null && ordenSocio < ordenMin) {
        throw new Error("Tu nivel no cumple el mínimo requerido para este turno.");
      }
      if (ordenMax != null && ordenSocio > ordenMax) {
        throw new Error("Tu nivel supera el máximo permitido para este turno.");
      }
    }
  }

  // 4. Reactivar la inscripción
  const { data, error } = await supabase
    .from("socio_turno")
    .update({ estado: true })
    .eq("turno_id", turnoId)
    .eq("user_id", socioId)
    .select();

  if (error) throw error;
  return data;
}
