-- ─────────────────────────────────────────────────────────────────────────────
-- Migración 001: configuracion_club — agregar columnas clave/valor/descripcion
-- Idempotente: usa IF NOT EXISTS y ON CONFLICT DO NOTHING
-- Reversible: ver sección ROLLBACK al final
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Agregar columnas (idempotente con IF NOT EXISTS)
ALTER TABLE configuracion_club
  ADD COLUMN IF NOT EXISTS clave       text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS valor       text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS descripcion text;

-- 2. Quitar el default temporal (las filas futuras deben proveer clave y valor)
ALTER TABLE configuracion_club
  ALTER COLUMN clave  DROP DEFAULT,
  ALTER COLUMN valor  DROP DEFAULT;

-- 3. Constraint único para evitar duplicados por club (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'configuracion_club_club_id_clave_key'
  ) THEN
    ALTER TABLE configuracion_club
      ADD CONSTRAINT configuracion_club_club_id_clave_key UNIQUE (club_id, clave);
  END IF;
END $$;

-- 4. Seed de constantes de negocio (ON CONFLICT = no pisas si ya existen)
--    club_id = 1 (SNOP Club — único club activo)
INSERT INTO configuracion_club (club_id, clave, valor, descripcion)
VALUES
  (1, 'horas_anticipacion_cancelacion',  '24',
   'Horas mínimas de anticipación para cancelar un turno y recuperar el crédito'),
  (1, 'dias_ultima_semana_mes',           '7',
   'Cantidad de días al final del mes en que el crédito se arrastra al mes siguiente'),
  (1, 'vigencia_aviso_lista_espera_horas','48',
   'Horas que tiene el socio para confirmar un lugar liberado en la lista de espera')
ON CONFLICT (club_id, clave) DO NOTHING;

-- ─── ROLLBACK (ejecutar manualmente si se necesita revertir) ─────────────────
-- DELETE FROM configuracion_club WHERE club_id = 1 AND clave IN (
--   'horas_anticipacion_cancelacion','dias_ultima_semana_mes','vigencia_aviso_lista_espera_horas'
-- );
-- ALTER TABLE configuracion_club
--   DROP CONSTRAINT IF EXISTS configuracion_club_club_id_clave_key,
--   DROP COLUMN IF EXISTS descripcion,
--   DROP COLUMN IF EXISTS valor,
--   DROP COLUMN IF EXISTS clave;
