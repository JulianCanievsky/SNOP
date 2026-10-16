-- ─────────────────────────────────────────────────────────────────────────────
-- Migración 002: socio_turno — migrar estado de boolean a texto
-- Idempotente y reversible. Mantiene la columna boolean durante transición.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Agregar columna nueva estado_texto (nullable durante backfill)
ALTER TABLE socio_turno
  ADD COLUMN IF NOT EXISTS estado_texto text;

-- 2. Backfill desde el boolean existente
--    true  → 'activo'
--    false → 'pendiente'  (el código actual usa false para pendiente y para cancelado)
UPDATE socio_turno
  SET estado_texto = CASE
    WHEN estado = true  THEN 'activo'
    WHEN estado = false THEN 'pendiente'
    ELSE 'pendiente'
  END
WHERE estado_texto IS NULL;

-- 3. Constraint CHECK para valores válidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'socio_turno_estado_texto_check'
  ) THEN
    ALTER TABLE socio_turno
      ADD CONSTRAINT socio_turno_estado_texto_check
      CHECK (estado_texto IN (
        'activo',
        'pendiente',
        'cancelado_a_tiempo',
        'cancelado_tarde',
        'baja_entrenador',
        'lista_espera'
      ));
  END IF;
END $$;

-- 4. Hacer NOT NULL (todos los registros ya fueron backfilleados)
ALTER TABLE socio_turno
  ALTER COLUMN estado_texto SET NOT NULL;

-- 5. Agregar columnas de auditoría para cancelaciones
ALTER TABLE socio_turno
  ADD COLUMN IF NOT EXISTS cancelado_por_id  integer REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS cancelado_at      timestamptz,
  ADD COLUMN IF NOT EXISTS modalidad         text
    CHECK (modalidad IN ('puntual', 'recurrente'));

-- Nota: la columna boolean `estado` se mantiene sin cambios durante la transición.
-- Una vez que todo el código use estado_texto, se puede ejecutar:
--   ALTER TABLE socio_turno DROP COLUMN estado;
-- (eso es una migración futura separada)

-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
-- ALTER TABLE socio_turno
--   DROP COLUMN IF EXISTS modalidad,
--   DROP COLUMN IF EXISTS cancelado_at,
--   DROP COLUMN IF EXISTS cancelado_por_id,
--   DROP CONSTRAINT IF EXISTS socio_turno_estado_texto_check,
--   DROP COLUMN IF EXISTS estado_texto;
