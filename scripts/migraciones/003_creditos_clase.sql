-- ─────────────────────────────────────────────────────────────────────────────
-- Migración 003: creditos_clase — agregar arrastrado y cancelado_por
-- Idempotente y reversible.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Columna arrastrado: true si el crédito fue trasladado al mes siguiente
ALTER TABLE creditos_clase
  ADD COLUMN IF NOT EXISTS arrastrado boolean NOT NULL DEFAULT false;

-- 2. Columna cancelado_por: quién generó el crédito (quién canceló el turno)
ALTER TABLE creditos_clase
  ADD COLUMN IF NOT EXISTS cancelado_por text
    CHECK (cancelado_por IN ('socio', 'entrenador', 'admin'));

-- 3. Constraint de unicidad para idempotencia: no generar dos créditos
--    por la misma cancelación de turno para el mismo usuario
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'creditos_clase_user_turno_origen_key'
  ) THEN
    ALTER TABLE creditos_clase
      ADD CONSTRAINT creditos_clase_user_turno_origen_key
      UNIQUE (user_id, turno_origen_id);
  END IF;
END $$;

-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
-- ALTER TABLE creditos_clase
--   DROP CONSTRAINT IF EXISTS creditos_clase_user_turno_origen_key,
--   DROP COLUMN IF EXISTS cancelado_por,
--   DROP COLUMN IF EXISTS arrastrado;
