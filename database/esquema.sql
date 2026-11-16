-- ============================================================================
-- SNOP — Club de Tenis de Mesa · Base de datos (PostgreSQL / Supabase)
-- Exportada el 16/11/2026, 10:03:43 (hora Argentina) con backend/scripts/exportar-bd.mjs
-- Contenido: esquema public (solo estructura, sin datos)
--
-- Cómo importarla en un proyecto de Supabase NUEVO (vacío):
--   SQL Editor → New query → pegar este archivo completo → Run
--   o desde una terminal: psql "<URI de conexión>" -f <este archivo>
-- ============================================================================

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET timezone = 'UTC';

BEGIN;

CREATE SCHEMA IF NOT EXISTS public;

-- ────────────────────────────────────────────────────────────────────────────
-- Secuencias (ids autoincrementales)
-- ────────────────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public."bono_turno_id_seq" AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."bonos_id_seq" AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."clubes_id_seq" AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."comunicados_id_seq" AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."configuracion_club_id_seq" AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."creditos_clase_id_seq" AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."inscripciones_juego_libre_id_seq" AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."inscripciones_torneo_id_seq" AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."juego_libre_id_seq" AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."lista_espera_turno_id_seq" AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."mesas_id_seq" AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."niveles_id_seq" AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."notificaciones_id_seq" AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."sedes_id_seq" AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."socio_turno_id_seq" AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."solicitudes_club_id_seq" AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."tipo_turno_id_seq" AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."tipo_usuario_id_seq" AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."torneos_id_seq" AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."turno_excepciones_id_seq" AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."turnos_id_seq" AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public."users_id_seq" AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

-- ────────────────────────────────────────────────────────────────────────────
-- Tablas
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE public."bono_turno" (
  "id" bigint DEFAULT nextval('bono_turno_id_seq'::regclass) NOT NULL,
  "bono_id" bigint NOT NULL,
  "turno_id" bigint NOT NULL,
  "socio_id" bigint NOT NULL,
  "fecha_uso" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."bonos" (
  "id" bigint DEFAULT nextval('bonos_id_seq'::regclass) NOT NULL,
  "socio_id" bigint NOT NULL,
  "tipo" text DEFAULT 'mensual'::text NOT NULL,
  "creditos_total" integer NOT NULL,
  "creditos_usados" integer DEFAULT 0 NOT NULL,
  "fecha_inicio" date NOT NULL,
  "fecha_vencimiento" date NOT NULL,
  "activo" boolean DEFAULT true NOT NULL,
  "notas" text,
  "creado_por" bigint,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."clubes" (
  "id" integer DEFAULT nextval('clubes_id_seq'::regclass) NOT NULL,
  "nombre" character varying(100) NOT NULL,
  "direccion" character varying(200),
  "ciudad" character varying(100),
  "logo_url" text,
  "activo" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."comunicados" (
  "id" bigint DEFAULT nextval('comunicados_id_seq'::regclass) NOT NULL,
  "titulo" text NOT NULL,
  "mensaje" text NOT NULL,
  "enviado_por" integer,
  "fecha" timestamp with time zone DEFAULT now(),
  "destinatarios" text[] DEFAULT ARRAY['todos'::text] NOT NULL
);

CREATE TABLE public."configuracion_club" (
  "id" integer DEFAULT nextval('configuracion_club_id_seq'::regclass) NOT NULL,
  "club_id" integer NOT NULL,
  "horas_cancelacion_min" integer DEFAULT 2 NOT NULL,
  "capacidad_mesas" integer,
  "politicas_json" jsonb,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "clave" text NOT NULL,
  "valor" text NOT NULL,
  "descripcion" text
);

CREATE TABLE public."creditos_clase" (
  "id" integer DEFAULT nextval('creditos_clase_id_seq'::regclass) NOT NULL,
  "user_id" integer,
  "turno_origen_id" integer,
  "mes_periodo" character varying(7) NOT NULL,
  "usado" boolean DEFAULT false,
  "turno_usado_id" integer,
  "fecha_generado" timestamp with time zone DEFAULT now(),
  "fecha_vencimiento" timestamp with time zone NOT NULL,
  "arrastrado" boolean DEFAULT false NOT NULL,
  "cancelado_por" text
);

CREATE TABLE public."inscripciones_juego_libre" (
  "id" integer DEFAULT nextval('inscripciones_juego_libre_id_seq'::regclass) NOT NULL,
  "evento_id" integer NOT NULL,
  "socio_id" integer,
  "fecha_inscripcion" timestamp with time zone DEFAULT now(),
  "estado" character varying(20) DEFAULT 'activo'::character varying NOT NULL
);

CREATE TABLE public."inscripciones_torneo" (
  "id" integer DEFAULT nextval('inscripciones_torneo_id_seq'::regclass) NOT NULL,
  "torneo_id" integer,
  "socio_id" integer,
  "estado" character varying DEFAULT 'activo'::character varying,
  "fecha_inscripcion" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."juego_libre" (
  "id" integer DEFAULT nextval('juego_libre_id_seq'::regclass) NOT NULL,
  "titulo" character varying(255) DEFAULT 'Juego Libre'::character varying NOT NULL,
  "sede_id" integer NOT NULL,
  "fecha_inicio" timestamp with time zone NOT NULL,
  "fecha_fin" timestamp with time zone NOT NULL,
  "capacidad_maxima" integer DEFAULT 12 NOT NULL,
  "activo" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "niveles_habilitados" integer[] DEFAULT '{}'::integer[] NOT NULL
);

CREATE TABLE public."lista_espera_turno" (
  "id" bigint DEFAULT nextval('lista_espera_turno_id_seq'::regclass) NOT NULL,
  "turno_id" bigint NOT NULL,
  "user_id" bigint NOT NULL,
  "fecha_inscripcion" timestamp with time zone DEFAULT now() NOT NULL,
  "notificado_at" timestamp with time zone,
  "estado" text DEFAULT 'esperando'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."mesas" (
  "id" integer DEFAULT nextval('mesas_id_seq'::regclass) NOT NULL,
  "sede_id" integer NOT NULL,
  "numero" integer NOT NULL,
  "activa" boolean DEFAULT true NOT NULL
);

CREATE TABLE public."niveles" (
  "id" integer DEFAULT nextval('niveles_id_seq'::regclass) NOT NULL,
  "nombre" character varying(50) NOT NULL,
  "orden" integer NOT NULL
);

CREATE TABLE public."notificaciones" (
  "id" integer DEFAULT nextval('notificaciones_id_seq'::regclass) NOT NULL,
  "user_id" integer,
  "titulo" character varying NOT NULL,
  "mensaje" text,
  "tipo" character varying,
  "leida" boolean DEFAULT false,
  "fecha" timestamp with time zone DEFAULT now(),
  "link" character varying
);

CREATE TABLE public."ratings_entrenador" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "socio_id" integer NOT NULL,
  "entrenador_id" integer NOT NULL,
  "turno_id" bigint NOT NULL,
  "estrellas" smallint NOT NULL,
  "comentario" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."sedes" (
  "id" integer DEFAULT nextval('sedes_id_seq'::regclass) NOT NULL,
  "club_id" integer NOT NULL,
  "nombre" character varying(100) NOT NULL,
  "direccion" character varying(200),
  "horario_apertura" timestamp with time zone,
  "horario_cierre" timestamp with time zone,
  "activo" boolean DEFAULT true NOT NULL
);

CREATE TABLE public."socio_turno" (
  "id" integer DEFAULT nextval('socio_turno_id_seq'::regclass) NOT NULL,
  "turno_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "estado" boolean DEFAULT true NOT NULL,
  "fecha_inscripcion" timestamp with time zone DEFAULT now() NOT NULL,
  "estado_texto" text NOT NULL,
  "cancelado_por_id" integer,
  "cancelado_at" timestamp with time zone,
  "modalidad" text
);

CREATE TABLE public."solicitudes_club" (
  "id" integer DEFAULT nextval('solicitudes_club_id_seq'::regclass) NOT NULL,
  "user_id" integer,
  "club_id" integer,
  "estado" character varying DEFAULT 'pendiente'::character varying,
  "fecha_solicitud" timestamp with time zone DEFAULT now(),
  "fecha_resolucion" timestamp with time zone,
  "resuelto_por" integer
);

CREATE TABLE public."tipo_estado" (
  "id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  "estado" text NOT NULL
);

CREATE TABLE public."tipo_turno" (
  "id" integer DEFAULT nextval('tipo_turno_id_seq'::regclass) NOT NULL,
  "nombre" character varying(50) NOT NULL
);

CREATE TABLE public."tipo_usuario" (
  "id" integer DEFAULT nextval('tipo_usuario_id_seq'::regclass) NOT NULL,
  "nombre" character varying(50) NOT NULL
);

CREATE TABLE public."torneos" (
  "id" integer DEFAULT nextval('torneos_id_seq'::regclass) NOT NULL,
  "nombre" character varying NOT NULL,
  "sede_id" integer,
  "fecha_inicio" timestamp with time zone NOT NULL,
  "fecha_fin" timestamp with time zone NOT NULL,
  "modalidad" character varying NOT NULL,
  "capacidad_maxima" integer DEFAULT 16,
  "niveles_habilitados_texto_old" text[],
  "activo" boolean DEFAULT true,
  "creado_por" integer,
  "niveles_habilitados" integer[] DEFAULT '{}'::integer[] NOT NULL
);

CREATE TABLE public."turno_excepciones" (
  "id" bigint DEFAULT nextval('turno_excepciones_id_seq'::regclass) NOT NULL,
  "turno_id" bigint NOT NULL,
  "fecha_excepcion" date NOT NULL,
  "motivo" text,
  "estado" text DEFAULT 'cancelado'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."turnos" (
  "id" integer DEFAULT nextval('turnos_id_seq'::regclass) NOT NULL,
  "tipo_turno_id" integer NOT NULL,
  "sede_id" integer NOT NULL,
  "mesa_id" integer NOT NULL,
  "user_id" integer,
  "fecha_inicio" character varying(30) NOT NULL,
  "fecha_fin" character varying(30) NOT NULL,
  "duracion_min" integer,
  "estado" boolean DEFAULT true NOT NULL,
  "capacidad_maxima" integer DEFAULT 1 NOT NULL,
  "nivel_minimo_id" integer,
  "nivel_maximo_id" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "recurrente" boolean DEFAULT false NOT NULL,
  "dia_semana" smallint,
  "hora_inicio" time without time zone,
  "hora_fin" time without time zone,
  "activo" boolean DEFAULT true NOT NULL
);

CREATE TABLE public."users" (
  "id" integer DEFAULT nextval('users_id_seq'::regclass) NOT NULL,
  "tipo_usuario_id" integer,
  "club_id" integer,
  "nombre" character varying(100) NOT NULL,
  "email" character varying(150) NOT NULL,
  "password" text,
  "telefono" character varying(20),
  "foto_url" text,
  "activo" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "nivel_id" integer,
  "cuota_al_dia" boolean DEFAULT true NOT NULL,
  "fecha_alta" timestamp with time zone,
  "rating" integer DEFAULT 0,
  "clases_dadas" integer DEFAULT 0,
  "auth_id" uuid,
  "estado_cuenta" character varying DEFAULT 'activa'::character varying NOT NULL,
  "eliminado_en" timestamp with time zone,
  "eliminado_por" integer
);

ALTER SEQUENCE public."bono_turno_id_seq" OWNED BY public."bono_turno"."id";
ALTER SEQUENCE public."bonos_id_seq" OWNED BY public."bonos"."id";
ALTER SEQUENCE public."clubes_id_seq" OWNED BY public."clubes"."id";
ALTER SEQUENCE public."comunicados_id_seq" OWNED BY public."comunicados"."id";
ALTER SEQUENCE public."configuracion_club_id_seq" OWNED BY public."configuracion_club"."id";
ALTER SEQUENCE public."creditos_clase_id_seq" OWNED BY public."creditos_clase"."id";
ALTER SEQUENCE public."inscripciones_juego_libre_id_seq" OWNED BY public."inscripciones_juego_libre"."id";
ALTER SEQUENCE public."inscripciones_torneo_id_seq" OWNED BY public."inscripciones_torneo"."id";
ALTER SEQUENCE public."juego_libre_id_seq" OWNED BY public."juego_libre"."id";
ALTER SEQUENCE public."lista_espera_turno_id_seq" OWNED BY public."lista_espera_turno"."id";
ALTER SEQUENCE public."mesas_id_seq" OWNED BY public."mesas"."id";
ALTER SEQUENCE public."niveles_id_seq" OWNED BY public."niveles"."id";
ALTER SEQUENCE public."notificaciones_id_seq" OWNED BY public."notificaciones"."id";
ALTER SEQUENCE public."sedes_id_seq" OWNED BY public."sedes"."id";
ALTER SEQUENCE public."socio_turno_id_seq" OWNED BY public."socio_turno"."id";
ALTER SEQUENCE public."solicitudes_club_id_seq" OWNED BY public."solicitudes_club"."id";
ALTER SEQUENCE public."tipo_turno_id_seq" OWNED BY public."tipo_turno"."id";
ALTER SEQUENCE public."tipo_usuario_id_seq" OWNED BY public."tipo_usuario"."id";
ALTER SEQUENCE public."torneos_id_seq" OWNED BY public."torneos"."id";
ALTER SEQUENCE public."turno_excepciones_id_seq" OWNED BY public."turno_excepciones"."id";
ALTER SEQUENCE public."turnos_id_seq" OWNED BY public."turnos"."id";
ALTER SEQUENCE public."users_id_seq" OWNED BY public."users"."id";

-- ────────────────────────────────────────────────────────────────────────────
-- Claves primarias, únicas y checks
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public."bono_turno" ADD CONSTRAINT "bono_turno_pkey" PRIMARY KEY (id);
ALTER TABLE public."bonos" ADD CONSTRAINT "bonos_pkey" PRIMARY KEY (id);
ALTER TABLE public."clubes" ADD CONSTRAINT "clubes_pkey" PRIMARY KEY (id);
ALTER TABLE public."comunicados" ADD CONSTRAINT "comunicados_pkey" PRIMARY KEY (id);
ALTER TABLE public."configuracion_club" ADD CONSTRAINT "configuracion_club_pkey" PRIMARY KEY (id);
ALTER TABLE public."creditos_clase" ADD CONSTRAINT "creditos_clase_pkey" PRIMARY KEY (id);
ALTER TABLE public."inscripciones_juego_libre" ADD CONSTRAINT "inscripciones_juego_libre_pkey" PRIMARY KEY (id);
ALTER TABLE public."inscripciones_torneo" ADD CONSTRAINT "inscripciones_torneo_pkey" PRIMARY KEY (id);
ALTER TABLE public."juego_libre" ADD CONSTRAINT "juego_libre_pkey" PRIMARY KEY (id);
ALTER TABLE public."lista_espera_turno" ADD CONSTRAINT "lista_espera_turno_pkey" PRIMARY KEY (id);
ALTER TABLE public."mesas" ADD CONSTRAINT "mesas_pkey" PRIMARY KEY (id);
ALTER TABLE public."niveles" ADD CONSTRAINT "niveles_pkey" PRIMARY KEY (id);
ALTER TABLE public."notificaciones" ADD CONSTRAINT "notificaciones_pkey" PRIMARY KEY (id);
ALTER TABLE public."ratings_entrenador" ADD CONSTRAINT "ratings_entrenador_pkey" PRIMARY KEY (id);
ALTER TABLE public."sedes" ADD CONSTRAINT "sedes_pkey" PRIMARY KEY (id);
ALTER TABLE public."socio_turno" ADD CONSTRAINT "socio_turno_pkey" PRIMARY KEY (id);
ALTER TABLE public."solicitudes_club" ADD CONSTRAINT "solicitudes_club_pkey" PRIMARY KEY (id);
ALTER TABLE public."tipo_estado" ADD CONSTRAINT "tipo_estado_pkey" PRIMARY KEY (id);
ALTER TABLE public."tipo_turno" ADD CONSTRAINT "tipo_turno_pkey" PRIMARY KEY (id);
ALTER TABLE public."tipo_usuario" ADD CONSTRAINT "tipo_usuario_pkey" PRIMARY KEY (id);
ALTER TABLE public."torneos" ADD CONSTRAINT "torneos_pkey" PRIMARY KEY (id);
ALTER TABLE public."turno_excepciones" ADD CONSTRAINT "turno_excepciones_pkey" PRIMARY KEY (id);
ALTER TABLE public."turnos" ADD CONSTRAINT "turnos_pkey" PRIMARY KEY (id);
ALTER TABLE public."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY (id);
ALTER TABLE public."bono_turno" ADD CONSTRAINT "bono_turno_unico" UNIQUE (bono_id, turno_id);
ALTER TABLE public."configuracion_club" ADD CONSTRAINT "configuracion_club_club_id_clave_key" UNIQUE (club_id, clave);
ALTER TABLE public."creditos_clase" ADD CONSTRAINT "creditos_clase_user_turno_origen_key" UNIQUE (user_id, turno_origen_id);
ALTER TABLE public."inscripciones_torneo" ADD CONSTRAINT "inscripciones_torneo_torneo_id_socio_id_key" UNIQUE (torneo_id, socio_id);
ALTER TABLE public."lista_espera_turno" ADD CONSTRAINT "lista_espera_turno_turno_user_key" UNIQUE (turno_id, user_id);
ALTER TABLE public."lista_espera_turno" ADD CONSTRAINT "lista_espera_unico" UNIQUE (turno_id, user_id);
ALTER TABLE public."ratings_entrenador" ADD CONSTRAINT "ratings_entrenador_socio_id_turno_id_key" UNIQUE (socio_id, turno_id);
ALTER TABLE public."socio_turno" ADD CONSTRAINT "socio_turno_turno_id_user_id_key" UNIQUE (turno_id, user_id);
ALTER TABLE public."turno_excepciones" ADD CONSTRAINT "turno_excepciones_turno_id_fecha_excepcion_key" UNIQUE (turno_id, fecha_excepcion);
ALTER TABLE public."users" ADD CONSTRAINT "users_auth_id_key" UNIQUE (auth_id);
ALTER TABLE public."users" ADD CONSTRAINT "users_email_key" UNIQUE (email);
ALTER TABLE public."users" ADD CONSTRAINT "users_email_unique" UNIQUE (email);
ALTER TABLE public."bonos" ADD CONSTRAINT "bonos_creditos_total_check" CHECK ((creditos_total > 0));
ALTER TABLE public."bonos" ADD CONSTRAINT "bonos_tipo_check" CHECK ((tipo = ANY (ARRAY['mensual'::text, 'trimestral'::text, 'personalizado'::text])));
ALTER TABLE public."bonos" ADD CONSTRAINT "creditos_no_negativos" CHECK ((creditos_usados >= 0));
ALTER TABLE public."bonos" ADD CONSTRAINT "creditos_no_supera_total" CHECK ((creditos_usados <= creditos_total));
ALTER TABLE public."creditos_clase" ADD CONSTRAINT "creditos_clase_cancelado_por_check" CHECK ((cancelado_por = ANY (ARRAY['socio'::text, 'entrenador'::text, 'admin'::text])));
ALTER TABLE public."inscripciones_torneo" ADD CONSTRAINT "inscripciones_torneo_estado_check" CHECK (((estado)::text = ANY ((ARRAY['activo'::character varying, 'cancelado'::character varying])::text[])));
ALTER TABLE public."ratings_entrenador" ADD CONSTRAINT "ratings_entrenador_estrellas_check" CHECK (((estrellas >= 1) AND (estrellas <= 5)));
ALTER TABLE public."socio_turno" ADD CONSTRAINT "socio_turno_estado_texto_check" CHECK ((estado_texto = ANY (ARRAY['activo'::text, 'pendiente'::text, 'cancelado_a_tiempo'::text, 'cancelado_tarde'::text, 'baja_entrenador'::text, 'lista_espera'::text])));
ALTER TABLE public."socio_turno" ADD CONSTRAINT "socio_turno_modalidad_check" CHECK ((modalidad = ANY (ARRAY['puntual'::text, 'recurrente'::text])));
ALTER TABLE public."solicitudes_club" ADD CONSTRAINT "solicitudes_club_estado_check" CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'aceptada'::character varying, 'rechazada'::character varying])::text[])));
ALTER TABLE public."torneos" ADD CONSTRAINT "torneos_modalidad_check" CHECK (((modalidad)::text = ANY ((ARRAY['singles'::character varying, 'dobles'::character varying])::text[])));
ALTER TABLE public."turno_excepciones" ADD CONSTRAINT "turno_excepciones_estado_check" CHECK ((estado = ANY (ARRAY['cancelado'::text, 'modificado'::text])));
ALTER TABLE public."turnos" ADD CONSTRAINT "turnos_dia_semana_check" CHECK (((dia_semana >= 0) AND (dia_semana <= 6)));
ALTER TABLE public."users" ADD CONSTRAINT "users_estado_cuenta_check" CHECK (((estado_cuenta)::text = ANY ((ARRAY['pendiente'::character varying, 'activa'::character varying, 'desactivada'::character varying])::text[])));

-- ────────────────────────────────────────────────────────────────────────────
-- Claves foráneas (relaciones entre tablas)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public."bono_turno" ADD CONSTRAINT "bono_turno_bono_id_fkey" FOREIGN KEY (bono_id) REFERENCES bonos(id) ON DELETE CASCADE;
ALTER TABLE public."bono_turno" ADD CONSTRAINT "bono_turno_socio_id_fkey" FOREIGN KEY (socio_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."bono_turno" ADD CONSTRAINT "bono_turno_turno_id_fkey" FOREIGN KEY (turno_id) REFERENCES turnos(id) ON DELETE CASCADE;
ALTER TABLE public."bonos" ADD CONSTRAINT "bonos_creado_por_fkey" FOREIGN KEY (creado_por) REFERENCES users(id);
ALTER TABLE public."bonos" ADD CONSTRAINT "bonos_socio_id_fkey" FOREIGN KEY (socio_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."comunicados" ADD CONSTRAINT "comunicados_enviado_por_fkey" FOREIGN KEY (enviado_por) REFERENCES users(id);
ALTER TABLE public."configuracion_club" ADD CONSTRAINT "configuracion_club_club_id_fkey" FOREIGN KEY (club_id) REFERENCES clubes(id);
ALTER TABLE public."creditos_clase" ADD CONSTRAINT "creditos_clase_turno_origen_id_fkey" FOREIGN KEY (turno_origen_id) REFERENCES turnos(id);
ALTER TABLE public."creditos_clase" ADD CONSTRAINT "creditos_clase_turno_usado_id_fkey" FOREIGN KEY (turno_usado_id) REFERENCES turnos(id);
ALTER TABLE public."creditos_clase" ADD CONSTRAINT "creditos_clase_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."inscripciones_juego_libre" ADD CONSTRAINT "inscripciones_juego_libre_evento_id_fkey" FOREIGN KEY (evento_id) REFERENCES juego_libre(id) ON DELETE CASCADE;
ALTER TABLE public."inscripciones_torneo" ADD CONSTRAINT "inscripciones_torneo_socio_id_fkey" FOREIGN KEY (socio_id) REFERENCES users(id);
ALTER TABLE public."inscripciones_torneo" ADD CONSTRAINT "inscripciones_torneo_torneo_id_fkey" FOREIGN KEY (torneo_id) REFERENCES torneos(id) ON DELETE CASCADE;
ALTER TABLE public."juego_libre" ADD CONSTRAINT "juego_libre_sede_id_fkey" FOREIGN KEY (sede_id) REFERENCES sedes(id);
ALTER TABLE public."lista_espera_turno" ADD CONSTRAINT "lista_espera_turno_turno_id_fkey" FOREIGN KEY (turno_id) REFERENCES turnos(id) ON DELETE CASCADE;
ALTER TABLE public."lista_espera_turno" ADD CONSTRAINT "lista_espera_turno_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."mesas" ADD CONSTRAINT "mesas_sede_id_fkey" FOREIGN KEY (sede_id) REFERENCES sedes(id);
ALTER TABLE public."notificaciones" ADD CONSTRAINT "notificaciones_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."ratings_entrenador" ADD CONSTRAINT "ratings_entrenador_entrenador_id_fkey" FOREIGN KEY (entrenador_id) REFERENCES users(id);
ALTER TABLE public."ratings_entrenador" ADD CONSTRAINT "ratings_entrenador_socio_id_fkey" FOREIGN KEY (socio_id) REFERENCES users(id);
ALTER TABLE public."ratings_entrenador" ADD CONSTRAINT "ratings_entrenador_turno_id_fkey" FOREIGN KEY (turno_id) REFERENCES turnos(id);
ALTER TABLE public."sedes" ADD CONSTRAINT "sedes_club_id_fkey" FOREIGN KEY (club_id) REFERENCES clubes(id);
ALTER TABLE public."socio_turno" ADD CONSTRAINT "socio_turno_cancelado_por_id_fkey" FOREIGN KEY (cancelado_por_id) REFERENCES users(id);
ALTER TABLE public."socio_turno" ADD CONSTRAINT "socio_turno_turno_id_fkey" FOREIGN KEY (turno_id) REFERENCES turnos(id);
ALTER TABLE public."socio_turno" ADD CONSTRAINT "socio_turno_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE public."solicitudes_club" ADD CONSTRAINT "solicitudes_club_club_id_fkey" FOREIGN KEY (club_id) REFERENCES clubes(id);
ALTER TABLE public."solicitudes_club" ADD CONSTRAINT "solicitudes_club_resuelto_por_fkey" FOREIGN KEY (resuelto_por) REFERENCES users(id);
ALTER TABLE public."solicitudes_club" ADD CONSTRAINT "solicitudes_club_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."torneos" ADD CONSTRAINT "torneos_creado_por_fkey" FOREIGN KEY (creado_por) REFERENCES users(id);
ALTER TABLE public."torneos" ADD CONSTRAINT "torneos_sede_id_fkey" FOREIGN KEY (sede_id) REFERENCES sedes(id);
ALTER TABLE public."turno_excepciones" ADD CONSTRAINT "turno_excepciones_turno_id_fkey" FOREIGN KEY (turno_id) REFERENCES turnos(id) ON DELETE CASCADE;
ALTER TABLE public."turnos" ADD CONSTRAINT "turnos_mesa_id_fkey" FOREIGN KEY (mesa_id) REFERENCES mesas(id);
ALTER TABLE public."turnos" ADD CONSTRAINT "turnos_nivel_maximo_id_fkey" FOREIGN KEY (nivel_maximo_id) REFERENCES niveles(id);
ALTER TABLE public."turnos" ADD CONSTRAINT "turnos_nivel_minimo_id_fkey" FOREIGN KEY (nivel_minimo_id) REFERENCES niveles(id);
ALTER TABLE public."turnos" ADD CONSTRAINT "turnos_sede_id_fkey" FOREIGN KEY (sede_id) REFERENCES sedes(id);
ALTER TABLE public."turnos" ADD CONSTRAINT "turnos_tipo_turno_id_fkey" FOREIGN KEY (tipo_turno_id) REFERENCES tipo_turno(id);
ALTER TABLE public."turnos" ADD CONSTRAINT "turnos_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE public."users" ADD CONSTRAINT "users_club_id_fkey" FOREIGN KEY (club_id) REFERENCES clubes(id);
ALTER TABLE public."users" ADD CONSTRAINT "users_nivel_id_fkey" FOREIGN KEY (nivel_id) REFERENCES niveles(id);
ALTER TABLE public."users" ADD CONSTRAINT "users_tipo_usuario_id_fkey" FOREIGN KEY (tipo_usuario_id) REFERENCES tipo_usuario(id);

-- ────────────────────────────────────────────────────────────────────────────
-- Índices
-- ────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_bono_turno_bono ON public.bono_turno USING btree (bono_id);
CREATE INDEX idx_bono_turno_turno ON public.bono_turno USING btree (turno_id);
CREATE INDEX idx_bonos_activo ON public.bonos USING btree (socio_id, activo, fecha_vencimiento);
CREATE INDEX idx_bonos_socio ON public.bonos USING btree (socio_id);
CREATE INDEX idx_inscripciones_evento ON public.inscripciones_juego_libre USING btree (evento_id, estado);
CREATE INDEX idx_inscripciones_socio ON public.inscripciones_juego_libre USING btree (socio_id, estado);
CREATE INDEX idx_juego_libre_fecha_inicio ON public.juego_libre USING btree (fecha_inicio, activo);
CREATE INDEX idx_lista_espera_turno ON public.lista_espera_turno USING btree (turno_id);
CREATE INDEX idx_lista_espera_turno_estado_created ON public.lista_espera_turno USING btree (turno_id, estado, created_at);
CREATE INDEX idx_lista_espera_user ON public.lista_espera_turno USING btree (user_id);
CREATE INDEX idx_mesas_sede_id ON public.mesas USING btree (sede_id);
CREATE INDEX idx_notificaciones_user_leida ON public.notificaciones USING btree (user_id, leida);
CREATE INDEX idx_sedes_club_id ON public.sedes USING btree (club_id);
CREATE INDEX idx_socio_turno_turno_id ON public.socio_turno USING btree (turno_id);
CREATE INDEX idx_socio_turno_user_id ON public.socio_turno USING btree (user_id);
CREATE INDEX idx_turno_excepciones_turno_id ON public.turno_excepciones USING btree (turno_id, fecha_excepcion);
CREATE INDEX idx_turnos_fecha_inicio ON public.turnos USING btree (fecha_inicio);
CREATE INDEX idx_turnos_recurrente_activo ON public.turnos USING btree (recurrente, activo, dia_semana);
CREATE INDEX idx_turnos_sede_id ON public.turnos USING btree (sede_id);
CREATE INDEX idx_turnos_user_id ON public.turnos USING btree (user_id);
CREATE INDEX idx_users_club_id ON public.users USING btree (club_id);
CREATE INDEX idx_users_email ON public.users USING btree (email);
CREATE INDEX idx_users_no_eliminados ON public.users USING btree (tipo_usuario_id) WHERE (eliminado_en IS NULL);
CREATE INDEX users_eliminado_en_null_idx ON public.users USING btree (eliminado_en) WHERE (eliminado_en IS NULL);

-- ────────────────────────────────────────────────────────────────────────────
-- Funciones
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.users (
    email,
    nombre,
    tipo_usuario_id,
    activo,
    cuota_al_dia,
    auth_id
  )
  VALUES (
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', 'Sin nombre'),
    1,
    true,
    false,
    NEW.id
  )
  ON CONFLICT (email) DO UPDATE
    SET auth_id = EXCLUDED.auth_id;

  RETURN NEW;
END;
$function$;


-- ────────────────────────────────────────────────────────────────────────────
-- Row Level Security y políticas
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public."bono_turno" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."bonos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."clubes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."comunicados" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."configuracion_club" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."creditos_clase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."inscripciones_juego_libre" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."inscripciones_torneo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."juego_libre" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."lista_espera_turno" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."mesas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."niveles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."notificaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ratings_entrenador" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."sedes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."socio_turno" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."solicitudes_club" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tipo_estado" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tipo_turno" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tipo_usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."torneos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."turno_excepciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."turnos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."users" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "socio_puede_anotarse_lista_espera" ON public."lista_espera_turno" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (((auth.uid())::text = (user_id)::text));
CREATE POLICY "socio_puede_leer_su_lista_espera" ON public."lista_espera_turno" AS PERMISSIVE FOR SELECT TO PUBLIC USING (((auth.uid())::text = (user_id)::text));
CREATE POLICY "socio_puede_salir_lista_espera" ON public."lista_espera_turno" AS PERMISSIVE FOR DELETE TO PUBLIC USING (((auth.uid())::text = (user_id)::text));
CREATE POLICY "service_role_excepciones" ON public."turno_excepciones" AS PERMISSIVE FOR ALL TO PUBLIC USING (true);
CREATE POLICY "Users can read own profile" ON public."users" AS PERMISSIVE FOR SELECT TO authenticated USING ((lower((email)::text) = lower((auth.jwt() ->> 'email'::text))));
CREATE POLICY "insert_own_profile" ON public."users" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "read_profiles" ON public."users" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "update_own_profile" ON public."users" AS PERMISSIVE FOR UPDATE TO authenticated USING (true);

COMMIT;
