-- ─────────────────────────────────────────────────────────────────────────────
-- Migración 005: niveles — reemplazar 5 categorías por 8
-- 1ª = la más alta (orden 1), 8ª = la más baja (orden 8)
-- Idempotente. Elimina las 5 filas anteriores e inserta las 8 nuevas.
-- PREREQUISITO: verificar que no existan FK activas apuntando a los ids 1-5
--               antes de ejecutar. Si existen, el DELETE fallará y habrá que
--               ejecutar primero UPDATE en users.nivel_id y turnos.nivel_*_id.
-- ─────────────────────────────────────────────────────────────────────────────

-- 0. Reasignar FK en users antes de borrar los niveles viejos
--    Mapeo: los socios que tenían un nivel viejo pasan a nivel NULL (sin categoría asignada)
--    El admin/entrenador deberá reasignarlos manualmente desde la app.
UPDATE users SET nivel_id = NULL WHERE nivel_id IN (1, 2, 3, 4, 5);

-- Reasignar FK en turnos (nivel_minimo_id y nivel_maximo_id)
UPDATE turnos SET nivel_minimo_id = NULL WHERE nivel_minimo_id IN (1, 2, 3, 4, 5);
UPDATE turnos SET nivel_maximo_id = NULL WHERE nivel_maximo_id IN (1, 2, 3, 4, 5);

-- 1. Borrar niveles existentes (ahora sin FK activas)
DELETE FROM niveles WHERE id IN (1, 2, 3, 4, 5);

-- 2. Insertar las 8 categorías nuevas
--    orden 1 = más alta (1ª categoría = élite)
--    orden 8 = más baja (8ª categoría = principiante)
INSERT INTO niveles (id, nombre, orden) VALUES
  (1, '1ª categoría', 1),
  (2, '2ª categoría', 2),
  (3, '3ª categoría', 3),
  (4, '4ª categoría', 4),
  (5, '5ª categoría', 5),
  (6, '6ª categoría', 6),
  (7, '7ª categoría', 7),
  (8, '8ª categoría', 8)
ON CONFLICT (id) DO UPDATE
  SET nombre = EXCLUDED.nombre,
      orden  = EXCLUDED.orden;

-- 3. Resetear secuencia para que el próximo auto-id sea 9
SELECT setval(pg_get_serial_sequence('niveles', 'id'), 8, true);

-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
-- DELETE FROM niveles WHERE id BETWEEN 1 AND 8;
-- INSERT INTO niveles (id, nombre, orden) VALUES
--   (1, 'Principiante', 1),(2, 'Azul', 2),(3, 'Intermedio', 3),
--   (4, 'Rojo', 4),(5, 'Avanzado', 5);
-- SELECT setval(pg_get_serial_sequence('niveles', 'id'), 5, true);
