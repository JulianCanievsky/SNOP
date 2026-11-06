/**
 * scripts/importar-socios.mjs
 *
 * Crea cuentas de socio en masa a partir de una planilla (.xlsx o .csv).
 * La contraseña inicial de cada socio es su DNI (solo números).
 *
 * Columnas (la primera fila son los encabezados; el orden no importa):
 *   Nombre y apellido  (obligatorio)
 *   Email              (obligatorio, único)
 *   DNI                (obligatorio, 7 u 8 dígitos; puntos y espacios se ignoran)
 *   Teléfono           (opcional)
 *   Nivel              (opcional: "3", "3ª", "3ra", "3ª categoría"...)
 *
 * Uso:
 *   node scripts/importar-socios.mjs socios.xlsx              → simulación, no crea nada
 *   node scripts/importar-socios.mjs socios.xlsx --confirmar  → crea las cuentas
 *   node scripts/importar-socios.mjs --plantilla socios.xlsx  → genera una planilla vacía
 *
 * Opciones:
 *   --club <id>   club al que pertenecen los socios (por defecto 1)
 *
 * Las filas con errores o con un email que ya existe se saltean; el resto se crea.
 * Al terminar se guarda un informe <archivo>.resultado.csv con lo que pasó en cada fila.
 */
import fs from 'node:fs'
import path from 'node:path'
import bcrypt from 'bcryptjs'
import ExcelJS from 'exceljs'

const BCRYPT_ROUNDS = 12 // igual que rutas/admin.js
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Encabezados aceptados por columna (normalizados: minúsculas, sin acentos ni signos)
const COLUMNAS = {
  nombre:   ['nombreyapellido', 'nombre', 'nombrecompleto', 'apellidoynombre', 'socio'],
  email:    ['email', 'mail', 'correo', 'correoelectronico', 'emailsocio'],
  dni:      ['dni', 'documento', 'nrodocumento', 'nrodedocumento', 'numerodedocumento'],
  telefono: ['telefono', 'tel', 'celular', 'whatsapp'],
  nivel:    ['nivel', 'categoria', 'nivelcategoria'],
}

// ── Argumentos ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const valorDe = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

if (flag('--plantilla')) {
  await generarPlantilla(valorDe('--plantilla') || 'plantilla-socios.xlsx')
  process.exit(0)
}

const archivo = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--club')
const confirmar = flag('--confirmar')
const clubId = Number(valorDe('--club') ?? 1)

if (!archivo) {
  console.log('Uso: node scripts/importar-socios.mjs <planilla.xlsx|.csv> [--confirmar] [--club <id>]')
  console.log('     node scripts/importar-socios.mjs --plantilla <salida.xlsx>')
  process.exit(1)
}
if (!fs.existsSync(archivo)) {
  console.error(`No existe el archivo: ${archivo}`)
  process.exit(1)
}

// Se importa acá (y no arriba) para que --plantilla funcione sin .env
const { default: supabase } = await import('../src/config/db.js')

// ── Leer planilla ────────────────────────────────────────────────────────────
const filas = await leerPlanilla(archivo)
if (filas.length === 0) {
  console.error('La planilla no tiene filas con datos.')
  process.exit(1)
}

const { data: niveles, error: errNiv } = await supabase.from('niveles').select('id, nombre, orden')
if (errNiv) throw errNiv

// Supabase devuelve como máximo 1000 filas por consulta: paginar
const emailsExistentes = new Set()
for (let desde = 0; ; desde += 1000) {
  const { data, error } = await supabase.from('users').select('email').range(desde, desde + 999)
  if (error) throw error
  data.forEach(u => u.email && emailsExistentes.add(u.email.toLowerCase()))
  if (data.length < 1000) break
}

// ── Validar ──────────────────────────────────────────────────────────────────
const vistosEnPlanilla = new Map() // email → nº de fila
const resultados = []

for (const f of filas) {
  const errores = []
  const nombre = f.nombre.replace(/\s+/g, ' ').trim()
  const email = f.email.trim().toLowerCase()
  const dni = f.dni.replace(/[.\s-]/g, '')
  const telefono = f.telefono.trim() || null
  let nivel_id = null

  if (!nombre) errores.push('falta el nombre')
  if (!email) errores.push('falta el email')
  else if (!EMAIL_RE.test(email)) errores.push(`email inválido (${email})`)
  if (!dni) errores.push('falta el DNI')
  else if (!/^\d{7,8}$/.test(dni)) errores.push(`DNI inválido (${f.dni})`)

  if (f.nivel.trim()) {
    const nivel = buscarNivel(f.nivel, niveles)
    if (nivel) nivel_id = nivel.id
    else errores.push(`nivel no reconocido (${f.nivel})`)
  }

  let estado = 'ok'
  if (errores.length) estado = 'error'
  else if (emailsExistentes.has(email)) { estado = 'ya existe'; errores.push('ya hay una cuenta con ese email') }
  else if (vistosEnPlanilla.has(email)) { estado = 'repetido'; errores.push(`email repetido (también en fila ${vistosEnPlanilla.get(email)})`) }

  if (email && !vistosEnPlanilla.has(email)) vistosEnPlanilla.set(email, f.fila)
  resultados.push({ fila: f.fila, nombre, email, dni, telefono, nivel_id, estado, detalle: errores.join('; ') })
}

const aCrear = resultados.filter(r => r.estado === 'ok')
const salteados = resultados.filter(r => r.estado !== 'ok')

console.log(`\nFilas leídas: ${resultados.length}`)
console.log(`  Para crear:  ${aCrear.length}`)
console.log(`  Salteadas:   ${salteados.length}`)
for (const r of salteados) console.log(`    fila ${r.fila} (${r.email || r.nombre || 'sin datos'}): ${r.detalle}`)

if (!confirmar) {
  console.log('\nSimulación: no se creó ninguna cuenta. Para crearlas, volvé a correr con --confirmar.')
  guardarInforme(archivo, resultados)
  process.exit(0)
}

// ── Crear cuentas ────────────────────────────────────────────────────────────
console.log(`\nCreando ${aCrear.length} cuentas (club ${clubId})...`)
let creadas = 0
for (const r of aCrear) {
  try {
    const hash = await bcrypt.hash(r.dni, BCRYPT_ROUNDS)
    const { error } = await supabase.from('users').insert({
      nombre: r.nombre,
      email: r.email,
      telefono: r.telefono,
      password: hash,
      nivel_id: r.nivel_id,
      club_id: clubId,
      tipo_usuario_id: 1,
      activo: true,
      estado_cuenta: 'activa',
      cuota_al_dia: true,
      fecha_alta: new Date().toISOString(),
    })
    if (error) throw error
    r.estado = 'creado'
    creadas++
    process.stdout.write(`\r  ${creadas}/${aCrear.length}`)
  } catch (err) {
    r.estado = 'error'
    r.detalle = `error al crear: ${err.message}`
    console.log(`\n    fila ${r.fila} (${r.email}): ${r.detalle}`)
  }
}
console.log(`\n\nListo: ${creadas} cuentas creadas, ${resultados.length - creadas} sin crear.`)
guardarInforme(archivo, resultados)

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Normaliza un encabezado: minúsculas, sin acentos ni signos. */
function normalizar(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')
}

/** Convierte una fila de celdas (texto) en un objeto con las columnas conocidas. */
function mapearFilas(encabezados, filasCrudas) {
  const idx = {}
  for (const [campo, alias] of Object.entries(COLUMNAS)) {
    idx[campo] = encabezados.findIndex(h => alias.includes(normalizar(h)))
  }
  const faltan = ['nombre', 'email', 'dni'].filter(c => idx[c] < 0)
  if (faltan.length) {
    console.error(`Faltan columnas obligatorias: ${faltan.join(', ')}`)
    console.error(`Encabezados encontrados: ${encabezados.filter(Boolean).join(' | ')}`)
    process.exit(1)
  }
  return filasCrudas
    .map(({ fila, celdas }) => {
      const get = (c) => (idx[c] >= 0 ? String(celdas[idx[c]] ?? '').trim() : '')
      return { fila, nombre: get('nombre'), email: get('email'), dni: get('dni'), telefono: get('telefono'), nivel: get('nivel') }
    })
    .filter(f => f.nombre || f.email || f.dni) // ignorar filas vacías
}

async function leerPlanilla(ruta) {
  const ext = path.extname(ruta).toLowerCase()
  if (ext === '.csv') return leerCsv(ruta)
  if (ext === '.xlsx') return leerXlsx(ruta)
  console.error('Formato no soportado: usá .xlsx o .csv')
  process.exit(1)
}

/** Texto plano de una celda de ExcelJS (números, links, texto enriquecido, fórmulas). */
function textoCelda(v) {
  if (v == null) return ''
  if (typeof v === 'number') return String(v)
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'object') {
    if (v.text != null) return typeof v.text === 'string' ? v.text : textoCelda(v.text)
    if (v.richText) return v.richText.map(r => r.text).join('')
    if (v.result != null) return textoCelda(v.result)
    if (v.hyperlink) return String(v.hyperlink).replace(/^mailto:/i, '')
  }
  return String(v)
}

async function leerXlsx(ruta) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(ruta)
  const hoja = wb.worksheets[0]
  const encabezados = []
  hoja.getRow(1).eachCell({ includeEmpty: true }, (c, col) => { encabezados[col - 1] = textoCelda(c.value) })
  const filasCrudas = []
  hoja.eachRow((row, n) => {
    if (n === 1) return
    const celdas = []
    row.eachCell({ includeEmpty: true }, (c, col) => { celdas[col - 1] = textoCelda(c.value) })
    filasCrudas.push({ fila: n, celdas })
  })
  return mapearFilas(encabezados, filasCrudas)
}

function leerCsv(ruta) {
  const texto = fs.readFileSync(ruta, 'utf8').replace(/^﻿/, '')
  const lineas = texto.split(/\r?\n/)
  // Excel en español exporta con ";"; si no, ","
  const sep = (lineas[0].match(/;/g) ?? []).length > (lineas[0].match(/,/g) ?? []).length ? ';' : ','
  const parsear = (linea) => {
    const out = []; let cur = ''; let q = false
    for (let i = 0; i < linea.length; i++) {
      const ch = linea[i]
      if (q) {
        if (ch === '"' && linea[i + 1] === '"') { cur += '"'; i++ }
        else if (ch === '"') q = false
        else cur += ch
      } else if (ch === '"') q = true
      else if (ch === sep) { out.push(cur); cur = '' }
      else cur += ch
    }
    out.push(cur)
    return out
  }
  const encabezados = parsear(lineas[0])
  const filasCrudas = lineas.slice(1).map((l, i) => ({ fila: i + 2, celdas: parsear(l) }))
  return mapearFilas(encabezados, filasCrudas)
}

/** Acepta "3", "3ª", "3ra", "3°", "3ª categoría", "tercera" o el nombre exacto del nivel. */
function buscarNivel(valor, lista) {
  const v = normalizar(valor)
  const exacto = lista.find(n => normalizar(n.nombre) === v)
  if (exacto) return exacto
  const ordinales = ['primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'septima', 'octava']
  const iOrd = ordinales.findIndex(o => v.startsWith(o))
  const num = iOrd >= 0 ? iOrd + 1 : Number(v.match(/^(\d+)/)?.[1])
  return num ? lista.find(n => n.orden === num) : undefined
}

function guardarInforme(ruta, filasResultado) {
  const salida = ruta.replace(/\.(xlsx|csv)$/i, '') + '.resultado.csv'
  const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`
  const lineas = [
    ['fila', 'nombre', 'email', 'estado', 'detalle'].join(';'),
    ...filasResultado.map(r => [r.fila, r.nombre, r.email, r.estado, r.detalle].map(esc).join(';')),
  ]
  fs.writeFileSync(salida, '﻿' + lineas.join('\r\n'), 'utf8') // BOM para que Excel lea los acentos
  console.log(`Informe guardado en ${salida}`)
}

async function generarPlantilla(salida) {
  const wb = new ExcelJS.Workbook()
  const hoja = wb.addWorksheet('Socios')
  hoja.columns = [
    { header: 'Nombre y apellido', key: 'nombre', width: 28 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'DNI', key: 'dni', width: 14 },
    { header: 'Teléfono', key: 'telefono', width: 18 },
    { header: 'Nivel', key: 'nivel', width: 10 },
  ]
  hoja.getRow(1).font = { bold: true }
  hoja.getColumn('dni').numFmt = '@'      // texto, para que Excel no lo convierta
  hoja.getColumn('telefono').numFmt = '@'
  hoja.views = [{ state: 'frozen', ySplit: 1 }]

  const ayuda = wb.addWorksheet('Instrucciones')
  ayuda.getColumn(1).width = 100
  ;[
    'Completá la hoja "Socios", una fila por socio. No cambies los encabezados.',
    '',
    'Nombre y apellido: obligatorio.',
    'Email: obligatorio. Cada socio necesita su propio email; con él entra a la app.',
    'DNI: obligatorio, solo números (ej. 35123456). Es la contraseña inicial del socio.',
    'Teléfono: opcional.',
    'Nivel: opcional. Número de categoría del 1 al 8 (1 = la más alta).',
    '',
    'Ejemplo: Juan Pérez | juan.perez@gmail.com | 35123456 | +54 11 5555 5555 | 5',
  ].forEach(t => ayuda.addRow([t]))

  await wb.xlsx.writeFile(salida)
  console.log(`Plantilla creada: ${salida}`)
}
