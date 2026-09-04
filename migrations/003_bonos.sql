-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRACIÓN 003 — Sistema de bonos
--
-- Ejecutar en Supabase → SQL Editor
--
-- Crea dos tablas:
--   bonos       — paquete de créditos asignado por el admin a un socio
--   bono_turno  — tabla intermedia many-to-many: qué créditos de qué bono
--                 se usaron en qué turno
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Tabla principal de bonos ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bonos (
  id                bigserial PRIMARY KEY,
  socio_id          bigint  NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  tipo              text    NOT NULL DEFAULT 'mensual'
                    CHECK (tipo IN ('mensual', 'trimestral', 'personalizado')),
  creditos_total    int     NOT NULL CHECK (creditos_total  > 0),
  creditos_usados   int     NOT NULL DEFAULT 0,
  fecha_inicio      date    NOT NULL,
  fecha_vencimiento date    NOT NULL,
  activo            boolean NOT NULL DEFAULT true,
  notas             text,
  creado_por        bigint  REFERENCES users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT creditos_no_negativos     CHECK (creditos_usados >= 0),
  CONSTRAINT creditos_no_supera_total  CHECK (creditos_usados <= creditos_total),
  CONSTRAINT fechas_coherentes         CHECK (fecha_vencimiento >= fecha_inicio)
);

-- ── 2. Tabla intermedia bono ↔ turnos (many-to-many) ─────────────────────────
CREATE TABLE IF NOT EXISTS bono_turno (
  id         bigserial   PRIMARY KEY,
  bono_id    bigint      NOT NULL REFERENCES bonos(id)   ON DELETE CASCADE,
  turno_id   bigint      NOT NULL REFERENCES turnos(id)  ON DELETE CASCADE,
  socio_id   bigint      NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  fecha_uso  timestamptz NOT NULL DEFAULT now(),

  -- Un bono no puede descontar dos veces el mismo turno
  CONSTRAINT bono_turno_unico UNIQUE (bono_id, turno_id)
);

-- ── 3. Índices ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bonos_socio
  ON bonos (socio_id);

-- Para buscar el bono activo vigente de un socio rápidamente
CREATE INDEX IF NOT EXISTS idx_bonos_activo
  ON bonos (socio_id, activo, fecha_vencimiento);

CREATE INDEX IF NOT EXISTS idx_bono_turno_bono
  ON bono_turno (bono_id);

CREATE INDEX IF NOT EXISTS idx_bono_turno_turno
  ON bono_turno (turno_id);

CREATE INDEX IF NOT EXISTS idx_bono_turno_socio
  ON bono_turno (socio_id);
