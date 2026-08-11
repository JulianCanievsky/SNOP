-- ============================================================
-- MIGRACIÓN 002: campos recurrentes en TURNOS + tabla turno_excepciones
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ── 1. Nuevos campos en la tabla TURNOS ──────────────────────────────────────
ALTER TABLE turnos
  ADD COLUMN IF NOT EXISTS recurrente   boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dia_semana   smallint    CHECK (dia_semana BETWEEN 0 AND 6),  -- 0=Dom,1=Lun...6=Sáb
  ADD COLUMN IF NOT EXISTS hora_inicio  time,       -- ej: '09:00'
  ADD COLUMN IF NOT EXISTS hora_fin     time,       -- ej: '10:00'
  ADD COLUMN IF NOT EXISTS activo       boolean     NOT NULL DEFAULT true;

-- Índice para listar plantillas recurrentes activas rápido
CREATE INDEX IF NOT EXISTS idx_turnos_recurrente_activo
  ON turnos(recurrente, activo, dia_semana);

-- ── 2. Tabla turno_excepciones ───────────────────────────────────────────────
-- Guarda las semanas en que un turno recurrente NO se realiza.
-- También puede usarse para instancias con entrenador sustituto (futuro).

CREATE TABLE IF NOT EXISTS turno_excepciones (
  id               bigserial    PRIMARY KEY,
  turno_id         bigint       NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
  fecha_excepcion  date         NOT NULL,   -- fecha exacta de la instancia cancelada (YYYY-MM-DD)
  motivo           text,
  estado           text         NOT NULL DEFAULT 'cancelado'
                   CHECK (estado IN ('cancelado', 'modificado')),
  created_at       timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (turno_id, fecha_excepcion)        -- una sola excepción por turno/fecha
);

CREATE INDEX IF NOT EXISTS idx_turno_excepciones_turno_id
  ON turno_excepciones(turno_id, fecha_excepcion);

ALTER TABLE turno_excepciones ENABLE ROW LEVEL SECURITY;

-- Solo service_role puede gestionar excepciones (el frontend usa el backend con service key)
CREATE POLICY "service_role_excepciones" ON turno_excepciones
  FOR ALL USING (true);

-- ── 3. Comentarios de campo para documentación ───────────────────────────────
COMMENT ON COLUMN turnos.recurrente  IS 'true = plantilla semanal recurrente; false = turno puntual';
COMMENT ON COLUMN turnos.dia_semana  IS '0=Domingo, 1=Lunes, ..., 6=Sábado';
COMMENT ON COLUMN turnos.hora_inicio IS 'Hora de inicio del turno recurrente (ej: 09:00)';
COMMENT ON COLUMN turnos.hora_fin    IS 'Hora de fin del turno recurrente (ej: 10:00)';
COMMENT ON COLUMN turnos.activo      IS 'false = turno dado de baja definitivamente';
