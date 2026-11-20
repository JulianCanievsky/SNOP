-- ============================================================================
-- SNOP — Datos iniciales (para probar la app con una base nueva)
--
-- Correr DESPUÉS de esquema.sql, en el SQL Editor de Supabase:
--   SQL Editor → New query → pegar este archivo completo → Run
--
-- Carga los catálogos que la app necesita para funcionar (roles, categorías,
-- club, sedes, mesas, tipos de turno, configuración) y cuatro usuarios de
-- prueba, uno por rol. Contraseña de todos: Snop1234
--
--   admin@snop.test        → Administrador
--   entrenador@snop.test   → Entrenador
--   socio@snop.test        → Socio (4ª categoría, con bono activo)
--   socio2@snop.test       → Socio (6ª categoría)
--
-- Todo corre en una transacción: o se carga completo o no se carga nada.
-- ============================================================================

BEGIN;

-- ─── Roles ──────────────────────────────────────────────────────────────────
INSERT INTO public.tipo_usuario (id, nombre) VALUES
  (1, 'socio'),
  (2, 'entrenador'),
  (3, 'admin');

-- ─── Categorías (1ª = élite, 8ª = principiante) ─────────────────────────────
INSERT INTO public.niveles (id, nombre, orden) VALUES
  (1, '1ª categoría', 1),
  (2, '2ª categoría', 2),
  (3, '3ª categoría', 3),
  (4, '4ª categoría', 4),
  (5, '5ª categoría', 5),
  (6, '6ª categoría', 6),
  (7, '7ª categoría', 7),
  (8, '8ª categoría', 8);

-- ─── Club, sedes y mesas ────────────────────────────────────────────────────
INSERT INTO public.clubes (id, nombre, direccion, ciudad, activo) VALUES
  (1, 'SNOP Club', NULL, 'Buenos Aires', true);

INSERT INTO public.sedes (id, club_id, nombre, direccion, activo) VALUES
  (1, 1, 'Belgrano', NULL, true),
  (2, 1, 'Palermo',  NULL, true);

INSERT INTO public.mesas (id, sede_id, numero, activa) VALUES
  (1, 1, 1, true), (2, 1, 2, true), (3, 1, 3, true), (4, 1, 4, true),
  (5, 2, 1, true), (6, 2, 2, true), (7, 2, 3, true), (8, 2, 4, true);

-- ─── Tipos de turno ─────────────────────────────────────────────────────────
INSERT INTO public.tipo_turno (id, nombre) VALUES
  (1, 'Entrenamiento'),
  (2, 'Clase'),
  (3, 'Juego Libre');

-- ─── Configuración del club (reglas de créditos de recupero) ────────────────
INSERT INTO public.configuracion_club (club_id, horas_cancelacion_min, clave, valor, descripcion) VALUES
  (1, 24, 'horas_anticipacion_cancelacion', '24', 'Horas mínimas de anticipación para que cancelar genere crédito'),
  (1, 24, 'dias_ultima_semana_mes',         '7',  'Días finales del mes en que el crédito pasa al mes siguiente');

-- ─── Usuarios de prueba (contraseña: Snop1234, hash bcrypt) ─────────────────
INSERT INTO public.users
  (id, tipo_usuario_id, club_id, nombre, email, password, telefono, activo, nivel_id,
   cuota_al_dia, fecha_alta, estado_cuenta)
VALUES
  (1, 3, 1, 'Admin SNOP',       'admin@snop.test',      '$2a$12$UKxRz8yXaxE5EvA4ZkzAYe8WBqWiTUIO8FRASxdpBKKT8WG3ijja.', NULL,         true, NULL, true, now(), 'activa'),
  (2, 2, 1, 'Entrenador Demo',  'entrenador@snop.test', '$2a$12$UKxRz8yXaxE5EvA4ZkzAYe8WBqWiTUIO8FRASxdpBKKT8WG3ijja.', '1100000002', true, NULL, true, now(), 'activa'),
  (3, 1, 1, 'Socio Demo',       'socio@snop.test',      '$2a$12$UKxRz8yXaxE5EvA4ZkzAYe8WBqWiTUIO8FRASxdpBKKT8WG3ijja.', '1100000003', true, 4,    true, now(), 'activa'),
  (4, 1, 1, 'Socia Demo',       'socio2@snop.test',     '$2a$12$UKxRz8yXaxE5EvA4ZkzAYe8WBqWiTUIO8FRASxdpBKKT8WG3ijja.', '1100000004', true, 6,    true, now(), 'activa');

-- Bono mensual activo para el socio de prueba (8 clases)
INSERT INTO public.bonos (socio_id, tipo, creditos_total, creditos_usados, fecha_inicio, fecha_vencimiento, activo, notas, creado_por) VALUES
  (3, 'mensual', 8, 0, current_date, current_date + 30, true, 'Bono de prueba', 1);

-- ─── Actividades de ejemplo (fechas relativas a hoy, así nunca quedan vencidas) ──
INSERT INTO public.juego_libre (titulo, sede_id, fecha_inicio, fecha_fin, capacidad_maxima, activo, niveles_habilitados) VALUES
  ('Juego Libre', 1, date_trunc('day', now()) + interval '7 days 21 hours', date_trunc('day', now()) + interval '7 days 23 hours', 12, true, '{}');

INSERT INTO public.torneos (nombre, sede_id, fecha_inicio, fecha_fin, modalidad, capacidad_maxima, activo, creado_por, niveles_habilitados) VALUES
  ('Torneo de prueba', 2, date_trunc('day', now()) + interval '14 days 13 hours', date_trunc('day', now()) + interval '14 days 21 hours', 'singles', 16, true, 1, '{}');

INSERT INTO public.comunicados (titulo, mensaje, enviado_por, destinatarios) VALUES
  ('¡Bienvenidos a SNOP!', 'Este es un comunicado de prueba enviado a todos los socios.', 1, ARRAY['todos']);

-- ─── Ajustar las secuencias (los ids de arriba se cargaron a mano) ──────────
SELECT setval('public.tipo_usuario_id_seq', (SELECT max(id) FROM public.tipo_usuario));
SELECT setval('public.niveles_id_seq',      (SELECT max(id) FROM public.niveles));
SELECT setval('public.clubes_id_seq',       (SELECT max(id) FROM public.clubes));
SELECT setval('public.sedes_id_seq',        (SELECT max(id) FROM public.sedes));
SELECT setval('public.mesas_id_seq',        (SELECT max(id) FROM public.mesas));
SELECT setval('public.tipo_turno_id_seq',   (SELECT max(id) FROM public.tipo_turno));
SELECT setval('public.users_id_seq',        (SELECT max(id) FROM public.users));

COMMIT;
