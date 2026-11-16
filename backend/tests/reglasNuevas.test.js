/**
 * Reglas agregadas en el sprint 3:
 *  - nivelHabilitado: categorías habilitadas en juego libre / torneos
 *  - ErrorNegocio / responderError: errores para el usuario vs. errores internos
 *  - fecha.js: hora en 24 hs y mes del crédito arrastrado
 */
import { vi } from 'vitest'
import { nivelHabilitado } from '../src/constants/categorias.js'
import { ErrorNegocio, responderError } from '../src/lib/errorNegocio.js'
import { formatHoraAR, formatArES, finDeProximoMesAR, periodoMesAR } from '../src/lib/fecha.js'

describe('nivelHabilitado', () => {
  it('lista vacía o null = abierto a todos (incluso sin categoría)', () => {
    expect(nivelHabilitado([], 3)).toBe(true)
    expect(nivelHabilitado(null, 3)).toBe(true)
    expect(nivelHabilitado(undefined, null)).toBe(true)
  })

  it('con restricción, solo las categorías listadas', () => {
    expect(nivelHabilitado([1, 2], 2)).toBe(true)
    expect(nivelHabilitado([1, 2], 3)).toBe(false)
  })

  it('socio sin categoría no entra a un evento restringido', () => {
    expect(nivelHabilitado([5], null)).toBe(false)
  })

  it('compara como números (la BD puede devolver strings)', () => {
    expect(nivelHabilitado(['3', '4'], 4)).toBe(true)
    expect(nivelHabilitado([3], '3')).toBe(true)
  })
})

describe('responderError', () => {
  const resFalso = () => {
    const res = {}
    res.status = vi.fn(() => res)
    res.json   = vi.fn(() => res)
    return res
  }

  it('ErrorNegocio → su status y su mensaje', () => {
    const res = resFalso()
    responderError(res, new ErrorNegocio('Ya estás inscripto', 409))
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ ok: false, mensaje: 'Ya estás inscripto' })
  })

  it('ErrorNegocio sin status → 400', () => {
    const res = resFalso()
    responderError(res, new ErrorNegocio('Dato inválido'))
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('cualquier otro error → 500 genérico, sin exponer el detalle', () => {
    const res = resFalso()
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    responderError(res, new Error('duplicate key value violates unique constraint "x"'), 'Error al cancelar')
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ ok: false, mensaje: 'Error al cancelar' })
    spy.mockRestore()
  })
})

describe('fecha.js — formato y arrastre', () => {
  it('la hora sale en 24 hs y en hora argentina', () => {
    expect(formatHoraAR('2026-06-23T21:30:00Z')).toBe('18:30')
    expect(formatArES('2026-06-23T13:00:00Z')).not.toMatch(/a\.\s?m\.|p\.\s?m\./)
  })

  it('crédito arrastrado desde el 31/01 pertenece a febrero (no a marzo)', () => {
    const vto = finDeProximoMesAR('2026-01-31T12:00:00-03:00')
    expect(periodoMesAR(vto)).toBe('2026-02')
  })

  it('arrastre de diciembre cruza de año', () => {
    expect(periodoMesAR(finDeProximoMesAR('2026-12-28T12:00:00-03:00'))).toBe('2027-01')
  })
})
