#!/usr/bin/env node
/**
 * lint:css — detecta colores hex sueltos fuera de src/index.css (tarea B2).
 * Revisa los .css y los estilos inline de los .jsx.
 * Los colores deben salir de los tokens CSS (var(--color-...)) definidos en src/index.css.
 * (Los emails HTML de src/lib/notificaciones.js no se revisan: los clientes de
 * correo no soportan variables CSS.)
 *
 * Uso:
 *   npm run lint:css               → conteo por archivo; sale con código 1 si hay alguno
 *   node scripts/lint-css.mjs      → además lista cada línea (archivo:línea  #hex)
 *
 * Para ignorar una línea puntual (ej. un email HTML o un logo): agregar el comentario
 *   /* lint-css-ignore *\/
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const RAIZ      = join(import.meta.dirname, '..')
const SRC       = join(RAIZ, 'src')
const PERMITIDO = join(SRC, 'index.css')
const HEX       = /#[0-9a-fA-F]{3,8}\b/g
const resumen   = process.argv.includes('--resumen')

function archivos(dir) {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) return archivos(ruta)
    return /\.(css|jsx)$/.test(nombre) && ruta !== PERMITIDO ? [ruta] : []
  })
}

let total = 0
const porArchivo = []

for (const archivo of archivos(SRC)) {
  const lineas = readFileSync(archivo, 'utf8').split('\n')
  const hallazgos = []
  lineas.forEach((linea, i) => {
    if (linea.includes('lint-css-ignore')) return
    for (const m of linea.matchAll(HEX)) hallazgos.push({ linea: i + 1, hex: m[0] })
  })
  if (hallazgos.length) {
    porArchivo.push({ archivo: relative(RAIZ, archivo).replaceAll('\\', '/'), hallazgos })
    total += hallazgos.length
  }
}

porArchivo.sort((a, b) => b.hallazgos.length - a.hallazgos.length)

for (const { archivo, hallazgos } of porArchivo) {
  console.log(`${String(hallazgos.length).padStart(4)}  ${archivo}`)
  if (!resumen) {
    for (const h of hallazgos) console.log(`        ${archivo}:${h.linea}  ${h.hex}`)
  }
}

if (total > 0) {
  console.log(`\n✖ ${total} colores hex fuera de src/index.css en ${porArchivo.length} archivos. Usar var(--color-…).`)
  process.exit(1)
}
console.log('✔ Sin colores hex sueltos.')
