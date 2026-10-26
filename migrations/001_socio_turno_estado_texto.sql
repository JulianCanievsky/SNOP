-- ============================================================
-- Migración 001: agregar estado_texto a socio_turno
-- Idempotente: usa IF NOT EXISTS / DO $$ para no fallar si ya existe
-- Reversible: ver sección ROLLBACK al final
-- ============================================================

-- ── FORWARD ──────────────────────────────────────────────────

-- 1. Agregar la columna con DEFAULT 'pendiente' (red de seguridad)
--    Si ya existe no hace nada.
ALTER TABLE socio_turno
  ADD COLUMN IF NOT EXISTS estado_texto text
    NOT NULL
    DEFAULT 'pendiente'
    CHECK (estado_texto IN (
      'activo',
      'pendiente',
      'cancelado_a_tiempo',
      'cancelado_tarde',
      'baja_entrenador'
    ));

-- 2. Backfill de filas existentes según el boolean estado:
--    estado=true  → 'activo'
--    estado=false → 'pendiente'  (mejor estimación; no se puede distinguir sin historial)
UPDATE socio_turno
SET estado_texto = CASE
  WHEN estado = true  THEN 'activo'
  WHEN estado = false THEN 'pendiente'
  ELSE 'pendiente'
END
WHERE estado_texto = 'pendiente';   -- solo las que quedaron con el default

-- ── ROLLBACK ─────────────────────────────────────────────────
-- Para revertir ejecutar:
--
--   ALTER TABLE socio_turno DROP COLUMN IF EXISTS estado_texto;
