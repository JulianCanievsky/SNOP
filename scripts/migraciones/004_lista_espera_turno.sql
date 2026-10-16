-- ─────────────────────────────────────────────────────────────────────────────
-- Migración 004: lista_espera_turno — agregar notificado_at
-- Idempotente y reversible.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Timestamp que registra cuándo se envió el aviso al socio
ALTER TABLE lista_espera_turno
  ADD COLUMN IF NOT EXISTS notificado_at timestamptz DEFAULT NULL;

-- 2. Constraint único para evitar que el mismo socio esté dos veces en espera
--    del mismo turno
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lista_espera_turno_turno_user_key'
  ) THEN
    ALTER TABLE lista_espera_turno
      ADD CONSTRAINT lista_espera_turno_turno_user_key
      UNIQUE (turno_id, user_id);
  END IF;
END $$;

-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
-- ALTER TABLE lista_espera_turno
--   DROP CONSTRAINT IF EXISTS lista_espera_turno_turno_user_key,
--   DROP COLUMN IF EXISTS notificado_at;
