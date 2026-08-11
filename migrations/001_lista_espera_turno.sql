-- ============================================================
-- MIGRACIÓN 001: lista_espera_turno
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- BACKUP PREVIO (ejecutar ANTES del DROP si alguna vez se necesita borrar):
-- CREATE TABLE lista_espera_turno_backup AS SELECT * FROM lista_espera_turno;

CREATE TABLE IF NOT EXISTS lista_espera_turno (
  id               bigserial PRIMARY KEY,
  turno_id         bigint NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
  user_id          bigint NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  fecha_solicitud  timestamptz NOT NULL DEFAULT now(),
  posicion         int,          -- se recalcula al insertar/cancelar
  estado           text NOT NULL DEFAULT 'esperando'
                   CHECK (estado IN ('esperando', 'promovido', 'cancelado')),
  UNIQUE (turno_id, user_id)     -- un socio no puede estar dos veces en la misma lista
);

-- Índice para consultas frecuentes por turno + estado
CREATE INDEX IF NOT EXISTS idx_lista_espera_turno_id_estado
  ON lista_espera_turno(turno_id, estado, posicion);

-- Índice para consultas del socio
CREATE INDEX IF NOT EXISTS idx_lista_espera_user_id
  ON lista_espera_turno(user_id);

-- RLS: habilitar (ajustar políticas según tu configuración de Supabase)
ALTER TABLE lista_espera_turno ENABLE ROW LEVEL SECURITY;

-- Política: el socio ve su propia fila; el admin (service_role) ve todo
CREATE POLICY "socio_ve_su_espera" ON lista_espera_turno
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "service_role_all" ON lista_espera_turno
  FOR ALL USING (true);
