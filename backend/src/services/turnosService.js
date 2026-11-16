import supabase from "../config/db.js";
import { ErrorNegocio } from "../lib/errorNegocio.js";
import { crearNotificacion, enviarEmail, emailListaEsperaPromovido, emailLugarDisponible } from "../lib/notificaciones.js";
import {
  parseFechaAR,
  formatArES,
  horasHasta,
  estaEnUltimaSemana,
  finDeMesAR,
  finDeProximoMesAR,
  periodoMesAR,
} from "../lib/fecha.js";
import { crearInscripcion, actualizarEstado, actualizarEstadoPorId, bajaEntrenadorPorId } from "./socioTurnoService.js";

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Devuelve las inscripciones ACTIVAS del socio, separadas en próximos e historial.
 * - próximos:  fecha_fin >= ahora (Argentina)
 * - historial: fecha_fin <  ahora
 *
 * Ambas listas están ordenadas por fecha_inicio.
 */
export async function getTurnosBySocio(socioId) {
  const { data, error } = await supabase
    .from("socio_turno")
    .select(`
      id,
      estado,
      estado_texto,
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

  const ahora = new Date();

  const proximos  = [];
  const historial = [];

  for (const row of data ?? []) {
    const fechaFin = row.turnos?.fecha_fin
      ? parseFechaAR(row.turnos.fecha_fin)
      : row.turnos?.fecha_inicio
        ? parseFechaAR(row.turnos.fecha_inicio)
        : null;

    if (!fechaFin || fechaFin >= ahora) {
      proximos.push(row);
    } else {
      historial.push(row);
    }
  }

  // Próximos: más cercano primero; historial: más reciente primero
  proximos.sort((a, b) =>
    new Date(a.turnos?.fecha_inicio ?? 0) - new Date(b.turnos?.fecha_inicio ?? 0)
  );
  historial.sort((a, b) =>
    new Date(b.turnos?.fecha_inicio ?? 0) - new Date(a.turnos?.fecha_inicio ?? 0)
  );

  return { proximos, historial };
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
  // 1. Verificar el turno antes de cancelar
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

  // 2. Buscar la inscripción activa del socio en este turno
  const { data: inscripcion, error: errInsc } = await supabase
    .from("socio_turno")
    .select("id")
    .eq("turno_id", turnoId)
    .eq("user_id", socioId)
    .eq("estado", true)
    .order("fecha_inscripcion", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (errInsc) throw errInsc;
  if (!inscripcion) throw new ErrorNegocio("No estás inscripto en este turno", 404);

  // 3. Determinar estado_texto según anticipación (≥ N hs → a tiempo, genera crédito)
  let horasAnticipacion = 24;
  try {
    const { data: config } = await supabase
      .from("configuracion_club")
      .select("clave, valor")
      .eq("club_id", 1)
      .in("clave", ["horas_anticipacion_cancelacion"]);
    const configMap = Object.fromEntries((config ?? []).map(c => [c.clave, c.valor]));
    horasAnticipacion = parseInt(configMap["horas_anticipacion_cancelacion"] ?? "24", 10);
  } catch { /* configuracion_club sin clave/valor → default 24 */ }

  const diffHoras = horasHasta(turno?.fecha_inicio ?? '');
  const estadoTextoFinal = diffHoras >= horasAnticipacion ? 'cancelado_a_tiempo' : 'cancelado_tarde';

  // Escritura única vía el servicio centralizado
  const data = await actualizarEstadoPorId({
    socioTurnoId: inscripcion.id,
    estado_texto: estadoTextoFinal,
  });

  // 4. Generar crédito de recupero si cancela con ≥ N horas de anticipación
  try {
    await generarCreditoSiCorresponde(turnoId, socioId, turno);
  } catch (creditoErr) {
    console.error("[cancelarTurno] Error al generar crédito:", creditoErr);
  }

  // 5. Cupo liberado: inscribir al primero de la lista de espera (regla 5).
  //    Si no había nadie esperando y el turno estaba lleno, avisar a interesados.
  if (turno) {
    try {
      const promovido = await promoverListaEspera(turno);
      if (!promovido && estabaTurnoLleno) await notificarLugarDisponible(turno, socioId);
    } catch (listaErr) {
      console.error("[cancelarTurno] lista de espera:", listaErr);
    }
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Genera un crédito de recupero si la cancelación se hace con suficiente anticipación.
 * Reglas:
 *   - Si ahora < fecha_inicio - N horas → genera crédito
 *   - mes_periodo = mes del turno; si cae en últimos 7 días del mes → arrastrar al siguiente
 *   - Idempotente: no duplica si ya existe un crédito para este turno+socio
 */
async function generarCreditoSiCorresponde(turnoId, socioId, turno, { ignorarAnticipacion = false } = {}) {
  if (!turno?.fecha_inicio) return;

  // Leer constantes de configuracion_club (club_id=1)
  const { data: config } = await supabase
    .from("configuracion_club")
    .select("clave, valor")
    .eq("club_id", 1)
    .in("clave", ["horas_anticipacion_cancelacion", "dias_ultima_semana_mes"]);

  const configMap = Object.fromEntries((config ?? []).map(c => [c.clave, c.valor]));
  const horasAnticipacion = parseInt(configMap["horas_anticipacion_cancelacion"] ?? "24", 10);
  const diasUltimaSemana  = parseInt(configMap["dias_ultima_semana_mes"]         ?? "7",  10);

  // Usar fecha.js para cálculos con TZ correcto
  // Si cancela el club (entrenador/admin) el crédito corresponde siempre
  const diffHoras = horasHasta(turno.fecha_inicio);
  if (!ignorarAnticipacion && diffHoras < horasAnticipacion) return;

  // Periodo y arrastre usando fecha.js
  const esUltimaSem = estaEnUltimaSemana(turno.fecha_inicio, diasUltimaSemana);
  // Arrastre: vence a fin del mes siguiente y pertenece a ese mes
  // (no sumar días: 31/01 + 32 días caería en marzo)
  const fechaVencimiento = esUltimaSem
    ? finDeProximoMesAR(turno.fecha_inicio)
    : finDeMesAR(turno.fecha_inicio);
  const mesPeriodo = periodoMesAR(esUltimaSem ? fechaVencimiento : turno.fecha_inicio);

  // Idempotencia: verificar si ya existe crédito para este turno+socio
  const { data: existente } = await supabase
    .from("creditos_clase")
    .select("id")
    .eq("user_id", socioId)
    .eq("turno_origen_id", turnoId)
    .maybeSingle();

  if (existente) return;

  await supabase.from("creditos_clase").insert({
    user_id:           socioId,
    turno_origen_id:   turnoId,
    mes_periodo:       mesPeriodo,
    usado:             false,
    arrastrado:        esUltimaSem,
    turno_usado_id:    null,
    fecha_generado:    new Date().toISOString(),
    fecha_vencimiento: fechaVencimiento,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// LISTA DE ESPERA
// ─────────────────────────────────────────────────────────────────────────────

/** "lunes 23 de junio, 10:00" o "lunes a las 10:00 hs" si es recurrente. */
function describirTurno(turno) {
  const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  if (turno.dia_semana != null && DIAS[turno.dia_semana]) {
    return `${DIAS[turno.dia_semana]}s a las ${turno.hora_inicio?.slice(0, 5) ?? ""} hs`;
  }
  return turno.fecha_inicio ? formatArES(turno.fecha_inicio) : "próximamente";
}

/**
 * Regla de negocio 5: si se libera un cupo, el PRIMERO de la lista de espera
 * (FIFO por created_at) queda inscripto directamente, sin aprobación.
 *
 * Llamar después de cualquier baja (cancelación del socio, quita del admin,
 * baja lógica de un socio). Es seguro llamarla aunque no haya lugar o lista.
 *
 * @param {{ id:number, capacidad_maxima:number, fecha_inicio?:string,
 *           dia_semana?:number, hora_inicio?:string, sedes?:{nombre:string} }} turno
 * @returns {Promise<{ id:number, nombre:string, email:string } | null>} socio promovido
 */
export async function promoverListaEspera(turno) {
  if (!turno?.id) return null;
  if (turno.fecha_inicio && parseFechaAR(turno.fecha_inicio) < new Date()) return null; // turno pasado

  // ¿Hay lugar?
  const { count: activos } = await supabase
    .from("socio_turno")
    .select("id", { count: "exact", head: true })
    .eq("turno_id", turno.id)
    .eq("estado", true);
  if ((activos ?? 0) >= (turno.capacidad_maxima ?? 0)) return null;

  // Primero en espera
  const { data: primero, error } = await supabase
    .from("lista_espera_turno")
    .select("id, user_id, users!lista_espera_turno_user_id_fkey(id, nombre, email)")
    .eq("turno_id", turno.id)
    .eq("estado", "esperando")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!primero?.user_id) return null;

  // Inscribir: reactivar su fila previa si existe, si no crear una nueva
  const { data: previa } = await supabase
    .from("socio_turno")
    .select("id, estado")
    .eq("turno_id", turno.id)
    .eq("user_id", primero.user_id)
    .order("fecha_inscripcion", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (previa?.estado !== true) {
    if (previa) {
      await actualizarEstadoPorId({ socioTurnoId: previa.id, estado_texto: "activo" });
    } else {
      await crearInscripcion({ turno_id: turno.id, user_id: primero.user_id, estado_texto: "activo" });
    }
  }

  await supabase
    .from("lista_espera_turno")
    .update({ estado: "promovido", notificado_at: new Date().toISOString() })
    .eq("id", primero.id);

  // Avisar (no crítico)
  const socio = primero.users;
  if (socio) {
    const fechaStr = describirTurno(turno);
    const sedeStr  = turno.sedes?.nombre ?? "la sede";
    try {
      await crearNotificacion({
        user_id: socio.id,
        titulo:  "¡Conseguiste un lugar!",
        mensaje: `Se liberó un cupo en el turno del ${fechaStr} en ${sedeStr}. Ya quedaste inscripto/a.`,
        tipo:    "lista_espera_promovido",
        link:    "/mis-clases",
      });
      await enviarEmail({
        to: socio.email,
        ...emailListaEsperaPromovido({ nombre: socio.nombre, fechaTurno: fechaStr, sede: sedeStr }),
      });
    } catch (notifErr) {
      console.error("[promoverListaEspera] aviso:", notifErr);
    }
  }

  console.log(`[listaEspera] socio ${primero.user_id} promovido al turno ${turno.id}`);
  return socio ?? { id: primero.user_id };
}

/**
 * Si nadie estaba en lista de espera, avisa (sin inscribir) a quienes alguna vez
 * estuvieron en el turno y cancelaron, para que se anoten si quieren.
 */
async function notificarLugarDisponible(turno, socioQueCancelo) {
  const fechaStr = describirTurno(turno);
  const sedeStr  = turno.sedes?.nombre ?? "la sede";

  const { data: cancelados } = await supabase
    .from("socio_turno")
    .select("user_id, users!socio_turno_user_id_fkey(id, nombre, email)")
    .eq("turno_id", turno.id)
    .eq("estado", false)
    .neq("user_id", socioQueCancelo);

  // Un socio puede tener varias filas canceladas: avisar una sola vez
  const destinatarios = [...new Map(
    (cancelados ?? []).map(c => c.users).filter(Boolean).map(u => [u.id, u])
  ).values()];

  for (const socio of destinatarios) {
    await crearNotificacion({
      user_id: socio.id,
      titulo:  "Se liberó un lugar",
      mensaje: `Se liberó un cupo en el turno del ${fechaStr} en ${sedeStr}. Anotate antes de que se llene.`,
      tipo:    "lugar_disponible",
      link:    "/mis-clases",
    });
    await enviarEmail({
      to: socio.email,
      ...emailLugarDisponible({ nombre: socio.nombre, fechaTurno: fechaStr, sede: sedeStr }),
    });
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

  if (errTurno || !turno) throw new ErrorNegocio("Turno no encontrado", 404);

  // 2. Verificar cupo disponible (sin contar la fila del propio socio, que ya existe con estado=false)
  const inscriptosActivos = (turno.socio_turno ?? []).filter(
    (s) => s.estado === true
  ).length;
  if (inscriptosActivos >= (turno.capacidad_maxima ?? 0)) {
    throw new ErrorNegocio("El turno ya está completo. No hay cupo disponible.", 409);
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
        throw new ErrorNegocio("Tu categoría no cumple el mínimo requerido para este turno", 403);
      }
      if (ordenMax != null && ordenSocio > ordenMax) {
        throw new ErrorNegocio("Tu categoría supera el máximo permitido para este turno", 403);
      }
    }
  }

  // 4. Reactivar la inscripción (vía socioTurnoService → mantiene estado_texto sincronizado)
  const data = await actualizarEstado({ turno_id: turnoId, user_id: socioId, estado_texto: 'activo' });
  return [data];
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Agrega al socio a la lista de espera de un turno (estado='esperando', FIFO por created_at).
 * Si ya estuvo antes en la lista (promovido o cancelado), se reutiliza esa fila y
 * vuelve al final de la cola.
 */
export async function unirseLista(turnoId, socioId) {
  const { data: turno, error: errTurno } = await supabase
    .from("turnos")
    .select("id, estado, capacidad_maxima, socio_turno(id, estado, user_id)")
    .eq("id", turnoId)
    .single();

  if (errTurno || !turno) throw new ErrorNegocio("Turno no encontrado", 404);
  if (!turno.estado) throw new ErrorNegocio("El turno está inactivo");

  const activos = (turno.socio_turno ?? []).filter((s) => s.estado === true);
  if (activos.some((s) => s.user_id === socioId)) throw new ErrorNegocio("Ya estás inscripto en este turno", 409);
  if (activos.length < (turno.capacidad_maxima ?? 0)) {
    throw new ErrorNegocio("Todavía hay lugar en este turno: podés anotarte directamente");
  }

  const { data: previa, error: errLista } = await supabase
    .from("lista_espera_turno")
    .select("id, estado")
    .eq("turno_id", turnoId)
    .eq("user_id", socioId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (errLista) throw errLista;

  if (previa?.estado === "esperando") throw new ErrorNegocio("Ya estás en la lista de espera de este turno", 409);

  const { data, error } = previa
    ? await supabase
        .from("lista_espera_turno")
        .update({ estado: "esperando", created_at: new Date().toISOString(), notificado_at: null })
        .eq("id", previa.id)
        .select()
        .single()
    : await supabase
        .from("lista_espera_turno")
        .insert({ turno_id: turnoId, user_id: socioId }) // estado y created_at: defaults de la BD
        .select()
        .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Saca al socio de la lista de espera (queda registro con estado='cancelado').
 */
export async function salirLista(turnoId, socioId) {
  const { error } = await supabase
    .from("lista_espera_turno")
    .update({ estado: "cancelado" })
    .eq("turno_id", turnoId)
    .eq("user_id", socioId)
    .eq("estado", "esperando");
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Socio solicita unirse a un turno de entrenamiento.
 * Inserta socio_turno con estado=false (pendiente de aprobación).
 * Verifica: turno activo, cupo disponible, nivel compatible, no duplicado.
 */
export async function solicitarTurno(turnoId, socioId) {
  // 1. Cargar turno con inscripciones activas
  const { data: turno, error: errTurno } = await supabase
    .from("turnos")
    .select("id, estado, activo, capacidad_maxima, nivel_minimo_id, nivel_maximo_id, user_id, socio_turno(id, estado, user_id)")
    .eq("id", turnoId)
    .single();

  if (errTurno || !turno) throw new ErrorNegocio("Turno no encontrado", 404);
  if (!turno.estado || turno.activo === false) throw new ErrorNegocio("El turno no está disponible");

  // 2. Verificar cupo
  const inscriptosActivos = (turno.socio_turno ?? []).filter(s => s.estado === true).length;
  if (inscriptosActivos >= (turno.capacidad_maxima ?? 0)) {
    throw new ErrorNegocio("El turno no tiene cupo disponible. Podés anotarte en la lista de espera.", 409);
  }

  // 3. Verificar que no está ya inscripto o pendiente
  const yaExiste = (turno.socio_turno ?? []).some(s => s.user_id === socioId);
  if (yaExiste) {
    const estaActivo = (turno.socio_turno ?? []).some(s => s.user_id === socioId && s.estado === true);
    if (estaActivo) throw new ErrorNegocio("Ya estás inscripto en este turno", 409);
    throw new ErrorNegocio("Ya tenés una solicitud pendiente para este turno", 409);
  }

  // 4. Verificar nivel del socio
  if (turno.nivel_minimo_id != null || turno.nivel_maximo_id != null) {
    const { data: socioData } = await supabase
      .from("users")
      .select("nivel_id")
      .eq("id", socioId)
      .single();

    if (socioData?.nivel_id != null) {
      const { data: niveles } = await supabase
        .from("niveles")
        .select("id, orden")
        .order("orden", { ascending: true });
      const nivelMap   = Object.fromEntries((niveles ?? []).map(n => [n.id, n.orden]));
      const ordenSocio = nivelMap[socioData.nivel_id] ?? 0;
      const ordenMin   = turno.nivel_minimo_id != null ? (nivelMap[turno.nivel_minimo_id] ?? 0) : null;
      const ordenMax   = turno.nivel_maximo_id != null ? (nivelMap[turno.nivel_maximo_id] ?? Infinity) : null;
      if (ordenMin != null && ordenSocio < ordenMin)
        throw new ErrorNegocio("Tu categoría no cumple el mínimo requerido para este turno", 403);
      if (ordenMax != null && ordenSocio > ordenMax)
        throw new ErrorNegocio("Tu categoría supera el máximo permitido para este turno", 403);
    }
  }

  // 5. Insertar solicitud pendiente (vía socioTurnoService → siempre escribe estado_texto)
  const data = await crearInscripcion({
    turno_id: turnoId,
    user_id:  socioId,
    estado_texto: 'pendiente',
  });

  if (!data) throw new Error("Error al crear inscripción");

  // 6. Notificar al entrenador del turno
  try {
    await crearNotificacion({
      user_id: turno.user_id,
      titulo:  "Nueva solicitud de turno",
      mensaje: "Un socio quiere unirse a tu turno. Revisá las solicitudes pendientes.",
      tipo:    "nueva_solicitud",
      link:    "/entrenador/solicitudes",
    });
  } catch { /* notificación no crítica */ }

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Lista los turnos de entrenamiento disponibles para el socio:
 *   - tipo_turno_id = 1 (entrenamiento)
 *   - estado = true, activo = true
 *   - fecha_inicio >= ahora (en ART)
 *   - nivel compatible con el socio (o NULL = apto para todos)
 * Enriquece con cupo_disponible y el estado del socio en cada turno.
 */
export async function getTurnosDisponibles(socioId) {
  const ahora = new Date().toISOString();

  // Cargar nivel del socio
  const { data: socioData } = await supabase
    .from("users")
    .select("nivel_id")
    .eq("id", socioId)
    .single();
  const nivelSocioId = socioData?.nivel_id ?? null;

  // Cargar niveles para comparar orden
  let nivelMap = {};
  let ordenSocio = null;
  if (nivelSocioId != null) {
    const { data: niveles } = await supabase.from("niveles").select("id, orden");
    nivelMap   = Object.fromEntries((niveles ?? []).map(n => [n.id, n.orden]));
    ordenSocio = nivelMap[nivelSocioId] ?? null;
  }

  const { data: turnos, error } = await supabase
    .from("turnos")
    .select(`
      id, fecha_inicio, fecha_fin, duracion_min, capacidad_maxima,
      nivel_minimo_id, nivel_maximo_id, tipo_turno_id,
      sedes(id, nombre),
      mesas(numero),
      users!turnos_user_id_fkey(id, nombre),
      niveles_min:niveles!turnos_nivel_minimo_id_fkey(id, nombre, orden),
      niveles_max:niveles!turnos_nivel_maximo_id_fkey(id, nombre, orden),
      socio_turno(id, estado, estado_texto, user_id)
    `)
    .eq("tipo_turno_id", 1)
    .eq("estado", true)
    .gte("fecha_inicio", ahora)
    .order("fecha_inicio", { ascending: true })
    .limit(50);

  if (error) throw error;

  // Turnos en los que el socio está esperando lugar
  const turnoIds = (turnos ?? []).map(t => t.id);
  let enEspera = new Set();
  if (turnoIds.length > 0) {
    const { data: espera } = await supabase
      .from("lista_espera_turno")
      .select("turno_id")
      .eq("user_id", socioId)
      .eq("estado", "esperando")
      .in("turno_id", turnoIds);
    enEspera = new Set((espera ?? []).map(e => e.turno_id));
  }

  return (turnos ?? [])
    .filter(t => {
      // Filtrar por nivel compatible
      if (t.nivel_minimo_id == null && t.nivel_maximo_id == null) return true; // apto para todos
      if (ordenSocio == null) return true; // sin nivel asignado — ve todos
      const ordenMin = t.nivel_minimo_id != null ? (nivelMap[t.nivel_minimo_id] ?? 0) : null;
      const ordenMax = t.nivel_maximo_id != null ? (nivelMap[t.nivel_maximo_id] ?? Infinity) : null;
      if (ordenMin != null && ordenSocio < ordenMin) return false;
      if (ordenMax != null && ordenSocio > ordenMax) return false;
      return true;
    })
    .map(t => {
      const inscriptos     = (t.socio_turno ?? []).filter(s => s.estado === true).length;
      const cupoDisponible = Math.max(0, (t.capacidad_maxima ?? 0) - inscriptos);
      const mias           = (t.socio_turno ?? []).filter(s => s.user_id === socioId);

      // Puede haber varias filas (canceló y volvió a pedir): manda la vigente
      let estadoSocio = "disponible";
      if (mias.some(s => s.estado === true))                  estadoSocio = "confirmado";
      else if (mias.some(s => s.estado_texto === "pendiente")) estadoSocio = "pendiente";

      return {
        id:              t.id,
        fecha_inicio:    t.fecha_inicio,
        fecha_fin:       t.fecha_fin,
        duracion_min:    t.duracion_min,
        capacidad_maxima:t.capacidad_maxima,
        cupo_disponible: cupoDisponible,
        inscriptos,
        nivel_minimo_id: t.nivel_minimo_id,
        nivel_maximo_id: t.nivel_maximo_id,
        nivel_minimo:    t.niveles_min ?? null,
        nivel_maximo:    t.niveles_max ?? null,
        sede:            t.sedes?.nombre ?? null,
        mesa:            t.mesas?.numero ?? null,
        entrenador:      t.users?.nombre ?? null,
        entrenador_id:   t.users?.id ?? null,
        estado_socio:    estadoSocio, // 'disponible' | 'pendiente' | 'confirmado'
        en_lista_espera: enEspera.has(t.id),
      };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * El club cancela un turno (entrenador cancela la clase o admin la suspende).
 * Cada inscripción activa pasa a 'baja_entrenador' y, si el turno es futuro,
 * genera crédito de recupero sin importar la anticipación.
 * No toca turnos.estado ni notifica: eso lo hace quien llama.
 *
 * @param {{ id:number, fecha_inicio:string }} turno
 * @returns {Promise<Array<{ id:number, nombre:string, email:string }>>} socios afectados
 */
export async function darDeBajaInscriptosPorClub(turno) {
  const { data: activos, error } = await supabase
    .from("socio_turno")
    .select("id, user_id, users!socio_turno_user_id_fkey(id, nombre, email)")
    .eq("turno_id", turno.id)
    .eq("estado", true);
  if (error) throw error;

  const esFuturo = turno.fecha_inicio && parseFechaAR(turno.fecha_inicio) > new Date();
  const afectados = [];

  for (const insc of activos ?? []) {
    await bajaEntrenadorPorId({ socioTurnoId: insc.id });
    if (esFuturo) {
      try {
        await generarCreditoSiCorresponde(turno.id, insc.user_id, turno, { ignorarAnticipacion: true });
      } catch (creditoErr) {
        console.error("[darDeBajaInscriptosPorClub] crédito socio", insc.user_id, creditoErr);
      }
    }
    if (insc.users) afectados.push(insc.users);
  }
  return afectados;
}
