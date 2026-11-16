/**
 * scripts/exportar-bd.mjs
 *
 * Genera un archivo .sql con el esquema `public` de la base de Supabase
 * (tablas, secuencias, constraints, índices, funciones, RLS y políticas)
 * y, opcionalmente, todos los datos. Es un reemplazo de `pg_dump` que no
 * necesita tener PostgreSQL ni Docker instalados: solo Node.
 *
 * Necesita la cadena de conexión directa a Postgres (no la service key):
 *   Supabase → Connect → Direct → Session pooler → copiar la URI
 *
 * Uso (desde la carpeta backend/):
 *   DATABASE_URL="postgresql://..." node scripts/exportar-bd.mjs snop.sql
 *   DATABASE_URL="postgresql://..." node scripts/exportar-bd.mjs esquema.sql --sin-datos
 *
 * El .sql resultante se importa en un proyecto de Supabase vacío pegándolo en
 * el SQL Editor, o con: psql "<URI>" -f snop.sql
 * Todo corre dentro de una transacción: o se importa completo o no se importa nada.
 */
import fs from 'node:fs'
import pg from 'pg'

const [, , salida, ...flags] = process.argv
const sinDatos = flags.includes('--sin-datos')

if (!salida || !process.env.DATABASE_URL) {
  console.error('Uso: DATABASE_URL="postgresql://..." node scripts/exportar-bd.mjs <archivo.sql> [--sin-datos]')
  process.exit(1)
}

const cliente = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
await cliente.connect()
const q = async (sql, params) => (await cliente.query(sql, params)).rows

const id = (nombre) => '"' + nombre.replace(/"/g, '""') + '"'
const tabla = (nombre) => `public.${id(nombre)}`
const lit = (texto) => "'" + String(texto).replace(/'/g, "''") + "'"

const out = []
const linea = (s = '') => out.push(s)
const seccion = (titulo) => {
  linea()
  linea('-- ' + '─'.repeat(76))
  linea('-- ' + titulo)
  linea('-- ' + '─'.repeat(76))
}

// ─── Objetos a exportar ─────────────────────────────────────────────────────

const tablas = await q(`
  SELECT c.oid, c.relname, c.relrowsecurity, c.relforcerowsecurity
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  ORDER BY c.relname`)

// Secuencias "sueltas" (las de columnas serial). Las de columnas IDENTITY se crean solas.
const secuencias = await q(`
  SELECT s.sequencename, s.data_type, s.start_value, s.min_value, s.max_value,
         s.increment_by, s.cycle, s.cache_size,
         dep_t.relname AS tabla_duena, dep_a.attname AS columna_duena
  FROM pg_sequences s
  JOIN pg_class c ON c.relname = s.sequencename
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = s.schemaname
  LEFT JOIN pg_depend d ON d.objid = c.oid AND d.deptype = 'a' AND d.refobjsubid > 0
  LEFT JOIN pg_class dep_t ON dep_t.oid = d.refobjid
  LEFT JOIN pg_attribute dep_a ON dep_a.attrelid = d.refobjid AND dep_a.attnum = d.refobjsubid
  WHERE s.schemaname = 'public'
    AND NOT EXISTS (SELECT 1 FROM pg_depend i WHERE i.objid = c.oid AND i.deptype = 'i')
  ORDER BY s.sequencename`)

async function columnasDe(oid) {
  return q(`
    SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS tipo, a.attnotnull,
           a.attidentity, a.attgenerated, pg_get_expr(d.adbin, d.adrelid) AS defecto
    FROM pg_attribute a
    LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE a.attrelid = $1 AND a.attnum > 0 AND NOT a.attisdropped
    ORDER BY a.attnum`, [oid])
}

// ─── Encabezado ─────────────────────────────────────────────────────────────

const ahora = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
linea('-- ============================================================================')
linea('-- SNOP — Club de Tenis de Mesa · Base de datos (PostgreSQL / Supabase)')
linea(`-- Exportada el ${ahora} (hora Argentina) con backend/scripts/exportar-bd.mjs`)
linea(`-- Contenido: esquema public ${sinDatos ? '(solo estructura, sin datos)' : '+ todos los datos'}`)
linea('--')
linea('-- Cómo importarla en un proyecto de Supabase NUEVO (vacío):')
linea('--   SQL Editor → New query → pegar este archivo completo → Run')
linea('--   o desde una terminal: psql "<URI de conexión>" -f <este archivo>')
linea('-- ============================================================================')
linea()
linea("SET client_encoding = 'UTF8';")
linea('SET standard_conforming_strings = on;')
linea('SET check_function_bodies = false;')
linea("SET timezone = 'UTC';")
linea()
linea('BEGIN;')
linea()
linea('CREATE SCHEMA IF NOT EXISTS public;')

// ─── Secuencias ─────────────────────────────────────────────────────────────

seccion('Secuencias (ids autoincrementales)')
for (const s of secuencias) {
  linea(`CREATE SEQUENCE IF NOT EXISTS public.${id(s.sequencename)} AS ${s.data_type}` +
    ` START WITH ${s.start_value} INCREMENT BY ${s.increment_by}` +
    ` MINVALUE ${s.min_value} MAXVALUE ${s.max_value} CACHE ${s.cache_size}${s.cycle ? ' CYCLE' : ''};`)
}

// ─── Tablas (sin constraints: se agregan después de cargar los datos) ───────

seccion('Tablas')
const columnasPorTabla = new Map()
for (const t of tablas) {
  const cols = await columnasDe(t.oid)
  columnasPorTabla.set(t.relname, cols)
  const defs = cols.map((c) => {
    let def = `  ${id(c.attname)} ${c.tipo}`
    if (c.attgenerated === 's') def += ` GENERATED ALWAYS AS (${c.defecto}) STORED`
    else if (c.attidentity === 'a') def += ' GENERATED ALWAYS AS IDENTITY'
    else if (c.attidentity === 'd') def += ' GENERATED BY DEFAULT AS IDENTITY'
    else if (c.defecto != null) def += ` DEFAULT ${c.defecto}`
    if (c.attnotnull) def += ' NOT NULL'
    return def
  })
  linea()
  linea(`CREATE TABLE ${tabla(t.relname)} (`)
  linea(defs.join(',\n'))
  linea(');')
}

const conDuena = secuencias.filter((s) => s.tabla_duena)
if (conDuena.length) {
  linea()
  for (const s of conDuena) {
    linea(`ALTER SEQUENCE public.${id(s.sequencename)} OWNED BY ${tabla(s.tabla_duena)}.${id(s.columna_duena)};`)
  }
}

// ─── Datos ──────────────────────────────────────────────────────────────────

const conteos = []
if (!sinDatos) {
  seccion('Datos')
  for (const t of tablas) {
    const cols = columnasPorTabla.get(t.relname).filter((c) => !c.attgenerated)
    const pk = await q(`
      SELECT a.attname FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1 AND i.indisprimary`, [t.oid])
    const orden = pk.length ? pk.map((p) => id(p.attname)).join(', ') : '1'
    const lista = cols.map((c) => id(c.attname)).join(', ')
    const override = cols.some((c) => c.attidentity === 'a') ? ' OVERRIDING SYSTEM VALUE' : ''
    // quote_nullable lo resuelve Postgres: cada valor sale como literal SQL válido.
    const valores = cols.map((c) => `quote_nullable(${id(c.attname)})`).join(', ')
    const filas = await q(`SELECT concat_ws(', ', ${valores}) AS v FROM ${tabla(t.relname)} ORDER BY ${orden}`)
    conteos.push([t.relname, filas.length])
    if (!filas.length) continue
    linea()
    linea(`-- ${t.relname}: ${filas.length} fila${filas.length === 1 ? '' : 's'}`)
    for (const f of filas) {
      linea(`INSERT INTO ${tabla(t.relname)} (${lista})${override} VALUES (${f.v});`)
    }
  }

  seccion('Valores actuales de las secuencias')
  for (const s of secuencias) {
    const [{ last_value: ultimo, is_called: usado }] = await q(
      `SELECT last_value, is_called FROM public.${id(s.sequencename)}`)
    linea(`SELECT setval('public.${id(s.sequencename)}', ${ultimo}, ${usado});`)
  }
  for (const t of tablas) {
    for (const c of columnasPorTabla.get(t.relname).filter((col) => col.attidentity)) {
      const [{ seq }] = await q('SELECT pg_get_serial_sequence($1, $2) AS seq', [`public.${id(t.relname)}`, c.attname])
      const [{ last_value: ultimo, is_called: usado }] = await q(`SELECT last_value, is_called FROM ${seq}`)
      linea(`SELECT setval(pg_get_serial_sequence(${lit(`public.${id(t.relname)}`)}, ${lit(c.attname)}), ${ultimo}, ${usado});`)
    }
  }
}

// ─── Constraints e índices ──────────────────────────────────────────────────

const constraints = await q(`
  SELECT c.relname, co.conname, co.contype, pg_get_constraintdef(co.oid) AS def
  FROM pg_constraint co
  JOIN pg_class c ON c.oid = co.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND co.contype IN ('p', 'u', 'c', 'x', 'f')
  ORDER BY CASE co.contype WHEN 'p' THEN 0 WHEN 'u' THEN 1 WHEN 'x' THEN 2 WHEN 'c' THEN 3 ELSE 4 END,
           c.relname, co.conname`)

seccion('Claves primarias, únicas y checks')
for (const co of constraints.filter((x) => x.contype !== 'f')) {
  linea(`ALTER TABLE ${tabla(co.relname)} ADD CONSTRAINT ${id(co.conname)} ${co.def};`)
}

seccion('Claves foráneas (relaciones entre tablas)')
for (const co of constraints.filter((x) => x.contype === 'f')) {
  linea(`ALTER TABLE ${tabla(co.relname)} ADD CONSTRAINT ${id(co.conname)} ${co.def};`)
}

const indices = await q(`
  SELECT pg_get_indexdef(i.indexrelid) AS def
  FROM pg_index i
  JOIN pg_class c ON c.oid = i.indrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND NOT EXISTS (SELECT 1 FROM pg_constraint co WHERE co.conindid = i.indexrelid)
  ORDER BY c.relname, 1`)

seccion('Índices')
for (const ix of indices) linea(`${ix.def};`)

// ─── Funciones ──────────────────────────────────────────────────────────────

const funciones = await q(`
  SELECT pg_get_functiondef(p.oid) AS def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prokind = 'f'
    AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  ORDER BY p.proname`)

seccion('Funciones')
for (const f of funciones) {
  linea(f.def.trim() + ';')
  linea()
}

const triggers = await q(`
  SELECT pg_get_triggerdef(t.oid) AS def
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND NOT t.tgisinternal
  ORDER BY c.relname, t.tgname`)
if (triggers.length) {
  seccion('Triggers')
  for (const tr of triggers) linea(`${tr.def};`)
}

// ─── Seguridad a nivel de fila (RLS) ────────────────────────────────────────

seccion('Row Level Security y políticas')
for (const t of tablas) {
  if (t.relrowsecurity) linea(`ALTER TABLE ${tabla(t.relname)} ENABLE ROW LEVEL SECURITY;`)
  if (t.relforcerowsecurity) linea(`ALTER TABLE ${tabla(t.relname)} FORCE ROW LEVEL SECURITY;`)
}
const politicas = await q(`
  SELECT c.relname, p.polname, p.polpermissive, p.polcmd,
         COALESCE((SELECT string_agg(CASE WHEN r = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(r)) END, ', ')
                   FROM unnest(p.polroles) r), 'PUBLIC') AS roles,
         pg_get_expr(p.polqual, p.polrelid) AS usando,
         pg_get_expr(p.polwithcheck, p.polrelid) AS chequeo
  FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
  ORDER BY c.relname, p.polname`)
const comandos = { r: 'SELECT', a: 'INSERT', w: 'UPDATE', d: 'DELETE', '*': 'ALL' }
if (politicas.length) linea()
for (const p of politicas) {
  let def = `CREATE POLICY ${id(p.polname)} ON ${tabla(p.relname)}` +
    ` AS ${p.polpermissive ? 'PERMISSIVE' : 'RESTRICTIVE'} FOR ${comandos[p.polcmd]} TO ${p.roles}`
  if (p.usando) def += ` USING (${p.usando})`
  if (p.chequeo) def += ` WITH CHECK (${p.chequeo})`
  linea(def + ';')
}

linea()
linea('COMMIT;')
linea()

await cliente.end()
fs.writeFileSync(salida, out.join('\n'), 'utf8')

console.log(`✔ ${salida}`)
console.log(`  ${tablas.length} tablas · ${secuencias.length} secuencias · ${constraints.length} constraints · ` +
  `${indices.length} índices · ${funciones.length} funciones · ${politicas.length} políticas`)
if (!sinDatos) {
  const total = conteos.reduce((s, [, n]) => s + n, 0)
  console.log(`  ${total} filas: ` + conteos.map(([t, n]) => `${t}=${n}`).join(' '))
}
