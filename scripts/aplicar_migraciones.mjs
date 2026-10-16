/**
 * Aplica todas las migraciones en orden usando el SQL Editor de Supabase (RPC exec_sql)
 * o directamente via fetch a la REST API de Supabase.
 *
 * Ejecutar: node scripts/aplicar_migraciones.mjs
 *
 * Si la ejecución automática falla (permisos insuficientes para ALTER TABLE),
 * el script imprime cada bloque SQL para que lo pegues manualmente en:
 * https://supabase.com/dashboard/project/jdmurvhfdoohocaafvnf/sql/new
 */
import 'dotenv/config'
import { readFileSync } from 'fs'
import { join } from 'path'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY

const MIGRACIONES = [
  '001_configuracion_club.sql',
  '002_socio_turno_estado.sql',
  '003_creditos_clase.sql',
  '004_lista_espera_turno.sql',
  '005_niveles_8cat.sql',
]

async function ejecutarSQL(sql) {
  // Intentar via RPC exec_sql (función custom que Supabase no tiene por defecto)
  // Si no existe, devolvemos el SQL para ejecución manual.
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql }),
  })

  if (resp.status === 404 || resp.status === 400) {
    // RPC no existe — devolver SQL para ejecución manual
    return { ok: false, manual: true }
  }

  const text = await resp.text()
  return { ok: resp.ok, status: resp.status, body: text }
}

console.log('\n═══════════════════════════════════════════════════')
console.log('  SNOP — Aplicador de migraciones')
console.log('═══════════════════════════════════════════════════\n')

let algunaFalló = false

for (const archivo of MIGRACIONES) {
  const ruta = join('scripts', 'migraciones', archivo)
  const sql  = readFileSync(ruta, 'utf-8')

  console.log(`▶ ${archivo}`)

  const resultado = await ejecutarSQL(sql).catch(e => ({ ok: false, error: e.message }))

  if (resultado.manual) {
    console.log(`  ⚠️  Ejecución automática no disponible.`)
    console.log(`  Pegá el contenido de scripts/migraciones/${archivo} en el SQL Editor de Supabase.\n`)
    algunaFalló = true
  } else if (resultado.ok) {
    console.log(`  ✅ OK\n`)
  } else {
    console.log(`  ❌ Error (${resultado.status}): ${resultado.body}\n`)
    algunaFalló = true
  }
}

if (algunaFalló) {
  console.log('═══════════════════════════════════════════════════')
  console.log('  Las migraciones deben aplicarse manualmente.')
  console.log('  SQL Editor de Supabase:')
  console.log('  https://supabase.com/dashboard/project/jdmurvhfdoohocaafvnf/sql/new')
  console.log('  Ejecutar en orden: 001 → 002 → 003 → 004 → 005')
  console.log('═══════════════════════════════════════════════════\n')
} else {
  console.log('  Todas las migraciones aplicadas correctamente. ✅\n')
}
