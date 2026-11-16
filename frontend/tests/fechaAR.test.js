/**
 * Tests: helpers de fecha en zona horaria Argentina (UTC-3)
 * Para correr: npm test
 */

const TZ = 'America/Argentina/Buenos_Aires'

/**
 * Convierte un ISO string a la fecha YYYY-MM-DD en zona horaria ART.
 * Mismo helper que se usa en el frontend (toLocalDateStr).
 */
function toFechaAR(isoString) {
  return new Date(isoString).toLocaleDateString('en-CA', { timeZone: TZ })
}

/**
 * Determina si un turno ya pasó, usando hora ART.
 * Un turno pasó si su fecha_fin (en ART) es anterior al momento actual (en ART).
 */
function turnoPaso(fechaFinISO, ahora = new Date()) {
  const fechaFinAR = new Date(fechaFinISO)
  return fechaFinAR < ahora
}

describe('toFechaAR: conversión de fecha a zona ART', () => {
  it('convierte medianoche UTC correctamente a ART (día anterior)', () => {
    // 2026-11-02T00:00:00Z = 2026-11-01T21:00:00-03:00 → fecha ART: 2026-11-01
    const resultado = toFechaAR('2026-11-02T00:00:00Z')
    expect(resultado).toBe('2026-11-01')
  })

  it('convierte medianoche ART correctamente (sin desplazamiento)', () => {
    // 2026-11-02T03:00:00Z = 2026-11-02T00:00:00-03:00 → fecha ART: 2026-11-02
    const resultado = toFechaAR('2026-11-02T03:00:00Z')
    expect(resultado).toBe('2026-11-02')
  })

  it('mantiene el día cuando la hora es el mediodía', () => {
    // 2026-11-02T15:00:00Z = 2026-11-02T12:00:00-03:00 → fecha ART: 2026-11-02
    const resultado = toFechaAR('2026-11-02T15:00:00Z')
    expect(resultado).toBe('2026-11-02')
  })
})

describe('turnoPaso: clasificación de turnos pasados', () => {
  it('turno con fecha_fin en el pasado está pasado', () => {
    const hace1hora = new Date(Date.now() - 60 * 60 * 1000)
    expect(turnoPaso(hace1hora.toISOString())).toBe(true)
  })

  it('turno con fecha_fin en el futuro no está pasado', () => {
    const en1hora = new Date(Date.now() + 60 * 60 * 1000)
    expect(turnoPaso(en1hora.toISOString())).toBe(false)
  })

  it('turno que termina justo ahora (1ms antes) está pasado', () => {
    const ahoraM1 = new Date(Date.now() - 1)
    expect(turnoPaso(ahoraM1.toISOString())).toBe(true)
  })
})
