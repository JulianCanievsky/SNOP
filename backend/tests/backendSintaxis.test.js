/**
 * Verifica que todos los archivos del backend parseen.
 * Motivo: en el commit 6489c95 rutas/admin.js y rutas/entrenador.js quedaron
 * con errores de sintaxis y el server no arrancaba, pero build y tests pasaban
 * porque ninguno importaba el backend.
 */
import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const raiz = join(import.meta.dirname, '..')

const archivos = [
  'server.js',
  ...readdirSync(join(raiz, 'rutas')).filter(f => f.endsWith('.js')).map(f => `rutas/${f}`),
  ...readdirSync(join(raiz, 'src/services')).filter(f => f.endsWith('.js')).map(f => `src/services/${f}`),
  'src/controllers/turnosController.js',
  'src/middlewares/autenticar.js',
  'src/lib/responder.js',
  'src/lib/notificaciones.js',
]

describe('backend — sintaxis', () => {
  it.each(archivos)('%s parsea sin errores', (archivo) => {
    expect(() =>
      execFileSync(process.execPath, ['--check', join(raiz, archivo)], { stdio: 'pipe' })
    ).not.toThrow()
  })
})
