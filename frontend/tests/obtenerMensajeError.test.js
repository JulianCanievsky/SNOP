/**
 * Tests: obtenerMensajeError
 * Para correr: npm test (requiere: npm install, vitest ya en devDependencies)
 */
import { obtenerMensajeError } from '../src/lib/errores.js'

describe('obtenerMensajeError', () => {
  it('extrae data.mensaje de respuesta del backend', () => {
    const err = { response: { data: { mensaje: 'Error de negocio' } } }
    expect(obtenerMensajeError(err)).toBe('Error de negocio')
  })

  it('extrae data.error si no hay data.mensaje', () => {
    const err = { response: { data: { error: 'Error de servidor' } } }
    expect(obtenerMensajeError(err)).toBe('Error de servidor')
  })

  it('usa el fallback proporcionado si no hay data ni response', () => {
    const err = {}
    expect(obtenerMensajeError(err, 'Algo salió mal')).toBe('Algo salió mal')
  })

  it('usa mensaje por defecto si no hay fallback ni data', () => {
    const err = {}
    const resultado = obtenerMensajeError(err)
    expect(typeof resultado).toBe('string')
    expect(resultado.length).toBeGreaterThan(0)
  })

  it('maneja error 401 con texto adecuado', () => {
    const err = { response: { status: 401, data: { mensaje: 'Token inválido o expirado' } } }
    expect(obtenerMensajeError(err)).toBe('Token inválido o expirado')
  })

  it('maneja error de red sin response', () => {
    const err = { message: 'Network Error' }
    const resultado = obtenerMensajeError(err, 'Sin conexión')
    expect(typeof resultado).toBe('string')
  })
})
