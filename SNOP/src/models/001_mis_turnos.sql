-- ============================================================
-- SNOP — Migración: tablas para "Mis Turnos" (Pantalla 5)
-- Nombres según el DER proporcionado
-- ============================================================

-- Tipos de usuario
CREATE TABLE IF NOT EXISTS tipo_usuario (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL
);

-- Clubes
CREATE TABLE IF NOT EXISTS clubes (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL,
  direccion  VARCHAR(200),
  ciudad     VARCHAR(100),
  logo_url   TEXT,
  activo     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Niveles
CREATE TABLE IF NOT EXISTS niveles (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,  -- Principiante, Azul, Intermedio, Rojo, Avanzado
  orden  INT        NOT NULL
);

-- Usuarios (tabla central del DER)
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  tipo_usuario_id INT          REFERENCES tipo_usuario(id),
  club_id         INT          REFERENCES clubes(id),
  nombre          VARCHAR(100) NOT NULL,
  email           VARCHAR(150) NOT NULL UNIQUE,
  password        TEXT         NOT NULL,
  telefono        VARCHAR(20),
  foto_url        TEXT,
  activo          BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  nivel_id        INT          REFERENCES niveles(id),
  cuota_al_dia    BOOLEAN      NOT NULL DEFAULT TRUE,
  fecha_alta      TIMESTAMPTZ,
  rating          INT          DEFAULT 0,
  clases_dadas    INT          DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_users_email   ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_club_id ON users(club_id);

-- Sedes
CREATE TABLE IF NOT EXISTS sedes (
  id               SERIAL PRIMARY KEY,
  club_id          INT          NOT NULL REFERENCES clubes(id),
  nombre           VARCHAR(100) NOT NULL,
  direccion        VARCHAR(200),
  horario_apertura TIMESTAMPTZ,
  horario_cierre   TIMESTAMPTZ,
  activo           BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_sedes_club_id ON sedes(club_id);

-- Mesas
CREATE TABLE IF NOT EXISTS mesas (
  id      SERIAL PRIMARY KEY,
  sede_id INT     NOT NULL REFERENCES sedes(id),
  numero  INT     NOT NULL,
  activa  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_mesas_sede_id ON mesas(sede_id);

-- Tipo de turno
CREATE TABLE IF NOT EXISTS tipo_turno (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL  -- Entrenamiento, Clase, Juego Libre
);

-- Turnos (tabla principal)
CREATE TABLE IF NOT EXISTS turnos (
  id              SERIAL PRIMARY KEY,
  tipo_turno_id   INT          NOT NULL REFERENCES tipo_turno(id),
  sede_id         INT          NOT NULL REFERENCES sedes(id),
  mesa_id         INT          NOT NULL REFERENCES mesas(id),
  user_id         INT          REFERENCES users(id),   -- entrenador asignado (nullable para juego libre)
  fecha_inicio    VARCHAR(30)  NOT NULL,               -- usar ISO 8601 string según DER
  fecha_fin       VARCHAR(30)  NOT NULL,
  duracion_min    INT,
  estado          BOOLEAN      NOT NULL DEFAULT TRUE,  -- true=activo, false=cancelado
  capacidad_maxima INT         NOT NULL DEFAULT 1,
  nivel_minimo_id INT          REFERENCES niveles(id),
  nivel_maximo_id INT          REFERENCES niveles(id),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_turnos_fecha_inicio ON turnos(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_turnos_sede_id      ON turnos(sede_id);
CREATE INDEX IF NOT EXISTS idx_turnos_user_id      ON turnos(user_id);

-- Socio-Turno (inscripción del socio al turno)
CREATE TABLE IF NOT EXISTS socio_turno (
  id                SERIAL PRIMARY KEY,
  turno_id          INT         NOT NULL REFERENCES turnos(id),
  user_id           INT         NOT NULL REFERENCES users(id),
  estado            BOOLEAN     NOT NULL DEFAULT TRUE,  -- true=activa, false=cancelada
  fecha_inscripcion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (turno_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_socio_turno_user_id  ON socio_turno(user_id);
CREATE INDEX IF NOT EXISTS idx_socio_turno_turno_id ON socio_turno(turno_id);

-- Notificaciones (necesarias para cancelación → notificar entrenador)
CREATE TABLE IF NOT EXISTS notificaciones (
  id          SERIAL PRIMARY KEY,
  user_id     INT         NOT NULL REFERENCES users(id),
  titulo      VARCHAR(200) NOT NULL,
  descripcion TEXT,
  leida       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_user_leida ON notificaciones(user_id, leida);

-- Configuración del club (para política de cancelación)
CREATE TABLE IF NOT EXISTS configuracion_club (
  id                   SERIAL PRIMARY KEY,
  club_id              INT  NOT NULL UNIQUE REFERENCES clubes(id),
  horas_cancelacion_min INT NOT NULL DEFAULT 2,
  capacidad_mesas      INT,
  politicas_json       JSONB,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Datos de prueba ───────────────────────────────────────────────────────────

INSERT INTO tipo_usuario (nombre) VALUES ('socio'), ('entrenador'), ('admin')
  ON CONFLICT DO NOTHING;

INSERT INTO tipo_turno (nombre) VALUES ('Entrenamiento'), ('Clase'), ('Juego Libre')
  ON CONFLICT DO NOTHING;

INSERT INTO niveles (nombre, orden) VALUES
  ('Principiante', 1),
  ('Azul',         2),
  ('Intermedio',   3),
  ('Rojo',         4),
  ('Avanzado',     5)
ON CONFLICT DO NOTHING;