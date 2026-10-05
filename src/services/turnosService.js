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
/**
 * Devuelve inscripciones canceladas (estado=false) del socio.
 * Se usan en MisClases para mostrar el botón "Reconfirmar" cuando
 * el socio estuvo en un turno, lo canceló, y luego se liberó un cupo.
 */
export async function getTurnosCancelados(socioId) {
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
        capacidad_maxima,
        tipo_turno (nombre),
        sedes (nombre, direccion),
        mesas (numero),
        users (nombre),
        socio_turno ( id, estado )
      )
    `)
    .eq("user_id", socioId)
    .eq("estado", false)
    .order("fecha_inscripcion", { ascending: false })
    .limit(20);

  if (error) {
    // No lanzar error si falla — simplemente devolver vacío
    console.error("getTurnosCancelados:", error);
    return [];
  }

  // Enriquecer con info de cupo actual
  return (data ?? []).map((row) => {
    const inscriptosActivos = (row.turnos?.socio_turno ?? []).filter(
      (s) => s.estado === true
    ).length;
    return {
      ...row,
      cupo_disponible: Math.max(
        0,
        (row.turnos?.capacidad_maxima ?? 0) - inscriptosActivos
      ),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
export async function cancelarTurno(turnoId, socioId) {
  // 1. Verificar el turno antes de cancelar (para saber si estaba lleno)
  const { data: turno } = await supabase
    .from("turnos")
    .select("id, capacidad_maxima, dia_semana, hora_inicio, fecha_inicio, sedes(nombre), socio_turno(id, estado)")
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
 * Envía notificación + email a socios interesados en el turno cuando se libera un cupo.
 * Notifica a:
 *   1. Socios en la tabla lista_espera_turno (se suscribieron activamente)
 *   2. Socios con inscripción cancelada en socio_turno (estuvieron inscriptos antes)
 * No duplica notificaciones si un socio aparece en ambas listas.
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

  // ── 1. Socios en lista de espera activa ────────────────────────────────────
  const listaEsperaIds = new Set();
  let destinatariosEspera = [];
  try {
    const { data: listaEspera } = await supabase
      .from("lista_espera_turno")
      .select("user_id, users!lista_espera_turno_user_id_fkey(id, nombre, email)")
      .eq("turno_id", turno.id)
      .neq("user_id", socioQueCancelo);

    destinatariosEspera = (listaEspera ?? [])
      .map(r => r.users)
      .filter(Boolean);

    destinatariosEspera.forEach(u => listaEsperaIds.add(u.id));
  } catch {
    // tabla lista_espera_turno puede no existir aún — ignorar
  }

  // ── 2. Socios con inscripción cancelada (excluyendo ya en lista espera) ────
  const { data: cancelados } = await supabase
    .from("socio_turno")
    .select("user_id, users!socio_turno_user_id_fkey(id, nombre, email)")
    .eq("turno_id", turno.id)
    .eq("estado", false)
    .neq("user_id", socioQueCancelo);

  const destinatariosCancelados = (cancelados ?? [])
    .map(c => c.users)
    .filter(Boolean)
    .filter(u => !listaEsperaIds.has(u.id)); // evitar duplicados

  // Unir ambas listas (lista espera primero — son los más interesados)
  const destinatarios = [...destinatariosEspera, ...destinatariosCancelados];

  const frontendUrl = process.env.FRONTEND_URL || "https://snop-psi.vercel.app";

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
          <h2 style="color:#2563eb;margin:0 0 8px;">🎾 Se liberó un lugar</h2>
          <p style="color:#555;margin:0 0 16px;">Hola <strong>${socio.nombre}</strong>, se liberó un cupo en el siguiente turno:</p>
          <div style="background:#eef2ff;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
            <p style="margin:0 0 4px;font-weight:700;color:#1e293b;">${fechaStr}</p>
            <p style="margin:0;color:#64748b;font-size:13px;">📍 ${sedeStr}</p>
          </div>
          <p style="color:#555;margin:0 0 20px;font-size:14px;">Anotate rápido antes de que se llene.</p>
          <a href="${frontendUrl}/mis-clases"
             style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:28px;text-decoration:none;font-weight:700;font-size:14px;">
            Ver mis clases
          </a>
          <p style="color:#999;font-size:12px;margin-top:24px;">Si ya no querés recibir estos avisos, podés salir de la lista de espera desde la app.</p>
        </div>
      `,
    });
  }

  if (destinatarios.length > 0) {
    console.log(`[lugarDisponible] Notificado a ${destinatarios.length} socio(s) del turno ${turno.id} (espera: ${destinatariosEspera.length}, cancelados: ${destinatariosCancelados.length})`);
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

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Agrega al socio a la lista de espera de un turno.
 * Usa la tabla lista_espera_turno (creada en migrations/003_bonos.sql o posterior).
 * Si la tabla no existe, lanza error descriptivo.
 */
export async function unirseLista(turnoId, socioId) {
  // Verificar que el turno existe y está activo
  const { data: turno, error: errTurno } = await supabase
    .from("turnos")
    .select("id, estado, capacidad_maxima, socio_turno(id, estado, user_id)")
    .eq("id", turnoId)
    .single();

  if (errTurno || !turno) throw new Error("Turno no encontrado");
  if (!turno.estado) throw new Error("El turno está inactivo");

  // Verificar que el socio no está ya inscripto activo
  const estaInscripto = (turno.socio_turno ?? []).some(
    (s) => s.user_id === socioId && s.estado === true
  );
  if (estaInscripto) throw new Error("Ya estás inscripto en este turno");

  // Verificar que no está ya en la lista de espera
  const { data: yaEnLista, error: errLista } = await supabase
    .from("lista_espera_turno")
    .select("id")
    .eq("turno_id", turnoId)
    .eq("user_id", socioId)
    .maybeSingle();

  if (errLista) {
    // Si la tabla no existe, fallback: usar socio_turno con estado=false
    if (errLista.code === "42P01") {
      // Verificar duplicado en socio_turno
      const yaEnSocioTurno = (turno.socio_turno ?? []).some(
        (s) => s.user_id === socioId && s.estado === false
      );
      if (yaEnSocioTurno) throw new Error("Ya estás en la lista de espera de este turno");
      const { error: errInsert } = await supabase
        .from("socio_turno")
        .insert({ turno_id: turnoId, user_id: socioId, estado: false, fecha_inscripcion: new Date().toISOString() });
      if (errInsert) throw errInsert;
      return { turno_id: turnoId, user_id: socioId, modo: "socio_turno" };
    }
    throw errLista;
  }

  if (yaEnLista) throw new Error("Ya estás en la lista de espera de este turno");

  const { data, error } = await supabase
    .from("lista_espera_turno")
    .insert({ turno_id: turnoId, user_id: socioId, fecha_inscripcion: new Date().toISOString() })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Elimina al socio de la lista de espera de un turno.
 */
export async function salirLista(turnoId, socioId) {
  // Intentar borrar de lista_espera_turno
  let borradoDeLista = false;
  try {
    const { error } = await supabase
      .from("lista_espera_turno")
      .delete()
      .eq("turno_id", turnoId)
      .eq("user_id", socioId);

    if (!error) borradoDeLista = true;
  } catch {
    // tabla no existe — continuar
  }

  if (!borradoDeLista) {
    // Fallback: marcar socio_turno como borrado (o dejarlo — no hacemos nada adicional)
    // El socio_turno con estado=false se mantiene para historial
  }
}
