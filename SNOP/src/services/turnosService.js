const pool = require('../config/db');

/**
 * Obtiene los turnos de un socio con filtros opcionales.
 * Hace JOIN con: sedes, mesas, tipo_turno, niveles (min y max), y el user del socio.
 *
 * @param {number} socioId
 * @param {object} filtros - { desde, hasta, estado }
 * @returns {Array} Lista de turnos
 */
const obtenerTurnosPorSocio = async (socioId, filtros = {}) => {
  const { desde, hasta, estado } = filtros;

  const valores = [socioId];
  const condiciones = ['st.user_id = $1'];

  if (desde) {
    valores.push(desde);
    condiciones.push(`t.fecha_inicio >= $${valores.length}`);
  }

  if (hasta) {
    valores.push(hasta);
    condiciones.push(`t.fecha_inicio <= $${valores.length}`);
  }

  if (estado !== undefined && estado !== null) {
    // estado en SOCIO_TURNO es booleano según el DER
    valores.push(estado === 'true' || estado === true);
    condiciones.push(`st.estado = $${valores.length}`);
  }

  const whereClause = condiciones.join(' AND ');

  const query = `
    SELECT
      t.id,
      t.fecha_inicio,
      t.fecha_fin,
      t.duracion_min,
      t.estado        AS turno_estado,
      t.capacidad_maxima,
      st.estado       AS inscripcion_activa,
      st.fecha_inscripcion,
      tt.nombre       AS tipo_turno,
      s.nombre        AS sede_nombre,
      s.direccion     AS sede_direccion,
      m.numero        AS mesa_numero,
      n_min.nombre    AS nivel_minimo,
      n_max.nombre    AS nivel_maximo,
      -- Datos del entrenador asignado al turno (user que creó el turno)
      u_ent.nombre    AS entrenador_nombre
    FROM socio_turno st
    INNER JOIN turnos t           ON t.id = st.turno_id
    INNER JOIN tipo_turno tt      ON tt.id = t.tipo_turno_id
    INNER JOIN sedes s            ON s.id = t.sede_id
    INNER JOIN mesas m            ON m.id = t.mesa_id
    LEFT  JOIN niveles n_min      ON n_min.id = t.nivel_minimo_id
    LEFT  JOIN niveles n_max      ON n_max.id = t.nivel_maximo_id
    LEFT  JOIN users u_ent        ON u_ent.id = t.user_id
    WHERE ${whereClause}
    ORDER BY t.fecha_inicio ASC
  `;

  const { rows } = await pool.query(query, valores);
  return rows;
};

/**
 * Obtiene los turnos de un socio agrupados por día para una semana ISO dada.
 *
 * @param {number} socioId
 * @param {string} semana - Formato YYYY-WW (ej: "2025-20")
 * @returns {object} Turnos agrupados por fecha (YYYY-MM-DD)
 */
const obtenerTurnosPorSemana = async (socioId, semana) => {
  if (!semana || !/^\d{4}-\d{1,2}$/.test(semana)) {
    throw new Error('El parámetro semana debe tener formato YYYY-WW.');
  }

  const [anio, semanaNum] = semana.split('-').map(Number);

  // Calcular el rango de fechas de la semana ISO
  const query = `
    SELECT
      t.id,
      t.fecha_inicio,
      t.fecha_fin,
      t.duracion_min,
      t.estado          AS turno_estado,
      st.estado         AS inscripcion_activa,
      tt.nombre         AS tipo_turno,
      s.nombre          AS sede_nombre,
      m.numero          AS mesa_numero,
      n_min.nombre      AS nivel_minimo,
      n_max.nombre      AS nivel_maximo,
      u_ent.nombre      AS entrenador_nombre,
      DATE(t.fecha_inicio) AS fecha_dia
    FROM socio_turno st
    INNER JOIN turnos t           ON t.id = st.turno_id
    INNER JOIN tipo_turno tt      ON tt.id = t.tipo_turno_id
    INNER JOIN sedes s            ON s.id = t.sede_id
    INNER JOIN mesas m            ON m.id = t.mesa_id
    LEFT  JOIN niveles n_min      ON n_min.id = t.nivel_minimo_id
    LEFT  JOIN niveles n_max      ON n_max.id = t.nivel_maximo_id
    LEFT  JOIN users u_ent        ON u_ent.id = t.user_id
    WHERE st.user_id = $1
      AND EXTRACT(ISOYEAR FROM t.fecha_inicio) = $2
      AND EXTRACT(WEEK    FROM t.fecha_inicio) = $3
    ORDER BY t.fecha_inicio ASC
  `;

  const { rows } = await pool.query(query, [socioId, anio, semanaNum]);

  // Generar los 7 días de la semana y agrupar turnos
  const diasSemana = generarDiasDeSemana(anio, semanaNum);
  const agrupado = {};

  diasSemana.forEach((fecha) => {
    agrupado[fecha] = [];
  });

  rows.forEach((turno) => {
    const fechaKey = turno.fecha_dia.toISOString().split('T')[0];
    if (agrupado[fechaKey]) {
      agrupado[fechaKey].push(turno);
    }
  });

  return agrupado;
};

/**
 * Cancela un turno si:
 *  - El turno pertenece al socio autenticado (via socio_turno)
 *  - La cancelación se hace con al menos X horas de anticipación (configurable)
 *
 * @param {number} turnoId
 * @param {number} socioId - userId del socio (del JWT)
 * @param {number} horasMinimas - política de cancelación (default: 2)
 * @returns {object} El registro de socio_turno actualizado
 */
const cancelarTurno = async (turnoId, socioId, horasMinimas = 2) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verificar que el socio está inscripto en ese turno y está activo
    const { rows: inscripcion } = await client.query(
      `SELECT st.id, t.fecha_inicio
       FROM socio_turno st
       INNER JOIN turnos t ON t.id = st.turno_id
       WHERE st.turno_id = $1
         AND st.user_id  = $2
         AND st.estado   = true`,
      [turnoId, socioId]
    );

    if (inscripcion.length === 0) {
      throw { status: 404, mensaje: 'Turno no encontrado o no pertenece al socio.' };
    }

    // 2. Verificar política de cancelación
    const fechaInicio = new Date(inscripcion[0].fecha_inicio);
    const ahora = new Date();
    const diferenciaHoras = (fechaInicio - ahora) / (1000 * 60 * 60);

    if (diferenciaHoras < horasMinimas) {
      throw {
        status: 400,
        mensaje: `No se puede cancelar con menos de ${horasMinimas} horas de anticipación.`,
      };
    }

    // 3. Marcar inscripción como cancelada (estado = false)
    const { rows: actualizado } = await client.query(
      `UPDATE socio_turno
       SET estado = false
       WHERE turno_id = $1 AND user_id = $2
       RETURNING *`,
      [turnoId, socioId]
    );

    await client.query('COMMIT');
    return actualizado[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Obtiene la configuración de horas mínimas de cancelación del club.
 * Si no existe configuración, devuelve el default de 2 horas.
 *
 * @param {number} clubId
 * @returns {number} horas mínimas
 */
const obtenerHorasMinCancelacion = async (clubId) => {
  try {
    const { rows } = await pool.query(
      `SELECT horas_cancelacion_min
       FROM configuracion_club
       WHERE club_id = $1`,
      [clubId]
    );
    return rows.length > 0 ? rows[0].horas_cancelacion_min : 2;
  } catch {
    return 2; // default si la tabla aún no existe
  }
};

// ─── Helper: genera array de fechas ISO de una semana ISO ───────────────────
const generarDiasDeSemana = (anio, semana) => {
  // El lunes de la semana ISO N del año Y
  const primerLunes = new Date(anio, 0, 1 + (semana - 1) * 7);
  const dia = primerLunes.getDay();
  const diff = dia <= 4 ? 1 - dia : 8 - dia; // ajuste ISO: semana empieza el lunes
  primerLunes.setDate(primerLunes.getDate() + diff);

  const dias = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(primerLunes);
    d.setDate(d.getDate() + i);
    dias.push(d.toISOString().split('T')[0]);
  }
  return dias;
};

module.exports = {
  obtenerTurnosPorSocio,
  obtenerTurnosPorSemana,
  cancelarTurno,
  obtenerHorasMinCancelacion,
};