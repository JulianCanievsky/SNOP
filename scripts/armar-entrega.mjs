/**
 * scripts/armar-entrega.mjs
 *
 * Arma la carpeta "2 - Codigo" de la entrega final:
 *   backend.zip   — código del backend + su .env (sin node_modules)
 *   frontend.zip  — código del frontend + su .env (sin node_modules ni dist)
 *   base-de-datos/snop.sql     — esquema + datos (si se pasa DATABASE_URL)
 *   base-de-datos/esquema.sql  — solo estructura
 *
 * El README.md de la carpeta de entrega NO se genera acá (tiene las cuentas de
 * prueba y no debe estar en el repo): si ya existe, no se toca.
 *
 * Uso (desde la raíz del repo):
 *   node scripts/armar-entrega.mjs "<carpeta destino>"
 *   DATABASE_URL="postgresql://..." node scripts/armar-entrega.mjs "<carpeta destino>"
 *
 * Usa tar.exe de Windows (bsdtar), que viene con Windows 10/11 y sabe crear .zip.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const RAIZ = path.join(import.meta.dirname, '..')
const destino = process.argv[2]
if (!destino) {
  console.error('Uso: node scripts/armar-entrega.mjs "<carpeta destino>"')
  process.exit(1)
}
const TAR = process.platform === 'win32' ? 'C:\\Windows\\System32\\tar.exe' : 'tar'

fs.mkdirSync(destino, { recursive: true })
const temporal = fs.mkdtempSync(path.join(os.tmpdir(), 'snop-entrega-'))

function empaquetar(carpeta) {
  // Archivos versionados + nuevos no ignorados (respeta .gitignore: sin node_modules, dist, .env)
  const archivos = execFileSync('git', ['ls-files', '-co', '--exclude-standard', carpeta], { cwd: RAIZ, encoding: 'utf8' })
    .split('\n').filter(Boolean)
    .filter((a) => fs.existsSync(path.join(RAIZ, a)))

  const env = path.join(carpeta, '.env')
  if (fs.existsSync(path.join(RAIZ, env))) archivos.push(env)
  else console.warn(`⚠ ${env} no existe: el zip va sin .env`)

  const base = path.join(temporal, carpeta)
  for (const a of archivos) {
    const dst = path.join(temporal, a)
    fs.mkdirSync(path.dirname(dst), { recursive: true })
    fs.copyFileSync(path.join(RAIZ, a), dst)
  }

  const zip = path.resolve(destino, `${carpeta}.zip`)
  fs.rmSync(zip, { force: true })
  // Los archivos van en la raíz del zip: "Extraer todo" de Windows crea la carpeta backend\ o frontend\
  execFileSync(TAR, ['-a', '-cf', zip, ...fs.readdirSync(base)], { cwd: base })
  console.log(`✔ ${carpeta}.zip — ${archivos.length} archivos, ${(fs.statSync(zip).size / 1024).toFixed(0)} KB`)
}

empaquetar('backend')
empaquetar('frontend')

const carpetaBD = path.join(destino, 'base-de-datos')
fs.mkdirSync(carpetaBD, { recursive: true })
if (process.env.DATABASE_URL) {
  const exportar = path.join(RAIZ, 'backend', 'scripts', 'exportar-bd.mjs')
  const opciones = { cwd: path.join(RAIZ, 'backend'), stdio: 'inherit' }
  execFileSync(process.execPath, [exportar, path.resolve(carpetaBD, 'snop.sql')], opciones)
  execFileSync(process.execPath, [exportar, path.resolve(carpetaBD, 'esquema.sql'), '--sin-datos'], opciones)
} else {
  fs.copyFileSync(path.join(RAIZ, 'database', 'esquema.sql'), path.join(carpetaBD, 'esquema.sql'))
  console.warn('⚠ Sin DATABASE_URL: solo se copió database/esquema.sql (sin datos). snop.sql no se regeneró.')
}

fs.rmSync(temporal, { recursive: true, force: true })

if (!fs.existsSync(path.join(destino, 'README.md'))) {
  console.warn('⚠ Falta README.md en la carpeta de entrega.')
}
console.log(`\nListo: ${path.resolve(destino)}`)
