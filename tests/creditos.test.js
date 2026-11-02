/**
 * Tests: lógica de créditos de recupero
 * Para correr: npm test
 */

// ── Funciones puras extraídas de la lógica de rutas/creditos.js ───────────────

/**
 * Calcula si un crédito está vencido.
 * Semántica: no fue usado Y ya pasó su fecha de vencimiento.
 */
function calcularVencido(credito, ahora = new Date()) {
  return !credito.usado && new Date(credito.fecha_vencimiento) < ahora
}

/**
 * Arma el resumen de créditos igual que el endpoint.
 */
function calcularResumen(creditos, ahora = new Date()) {
  const calculados = creditos.map(c => ({
    ...c,
    vencido: calcularVencido(c, ahora),
  }))
  return {
    disponibles: calculados.filter(c => !c.usado && !c.vencido).length,
    usados:      calculados.filter(c =>  c.usado).length,
    vencidos:    calculados.filter(c =>  c.vencido).length,
    creditos:    calculados,
  }
}

/**
 * Determina si una cancelación con X horas de anticipación genera crédito.
 * Regla: cancelar con ≥ 24 horas genera crédito.
 * @param {Date} ahora         — momento de la cancelación
 * @param {Date} fechaClase    — inicio de la clase
 * @returns {boolean}
 */
function generaCredito(ahora, fechaClase) {
  const diffMs = fechaClase.getTime() - ahora.getTime()
  const diffHs = diffMs / (1000 * 60 * 60)
  return diffHs >= 24
}

/**
 * Determina el mes de vencimiento del crédito.
 * Regla: si la clase cae en la última semana del mes → crédito se arrastra al mes siguiente.
 * "Última semana" = últimos 7 días del mes.
 */
function calcularMesVencimiento(fechaClase) {
  const d = new Date(fechaClase)
  // Último día del mes de la clase
  const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  const diaDelMes = d.getDate()
  const esUltimaSemana = diaDelMes > (ultimoDia - 7)

  if (esUltimaSemana) {
    // Arrastre: vence el mes siguiente
    return new Date(d.getFullYear(), d.getMonth() + 2, 0) // fin del mes siguiente
  }
  // Sin arrastre: vence al final del mismo mes
  return new Date(d.getFullYear(), d.getMonth() + 1, 0) // fin del mes actual
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('calcularVencido: vencido ≠ usado', () => {
  it('crédito usado NO es vencido', () => {
    const c = { usado: true, fecha_vencimiento: '2020-01-01T00:00:00Z' }
    expect(calcularVencido(c)).toBe(false)
  })

  it('crédito no usado con fecha pasada ES vencido', () => {
    const c = { usado: false, fecha_vencimiento: '2020-01-01T00:00:00Z' }
    expect(calcularVencido(c)).toBe(true)
  })

  it('crédito no usado con fecha futura NO es vencido', () => {
    const futuro = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const c = { usado: false, fecha_vencimiento: futuro.toISOString() }
    expect(calcularVencido(c)).toBe(false)
  })

  it('crédito no usado exactamente en la fecha de vencimiento ES vencido (strict <)', () => {
    const exacto = new Date(Date.now() - 1) // 1ms en el pasado
    const c = { usado: false, fecha_vencimiento: exacto.toISOString() }
    expect(calcularVencido(c)).toBe(true)
  })
})

describe('calcularResumen: contadores correctos', () => {
  it('separa disponibles, usados y vencidos correctamente', () => {
    const pasado = '2020-01-01T00:00:00Z'
    const futuro = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const creditos = [
      { id: 1, usado: false, fecha_vencimiento: futuro  },  // disponible
      { id: 2, usado: false, fecha_vencimiento: futuro  },  // disponible
      { id: 3, usado: true,  fecha_vencimiento: futuro  },  // usado
      { id: 4, usado: false, fecha_vencimiento: pasado  },  // vencido
    ]

    const resumen = calcularResumen(creditos)
    expect(resumen.disponibles).toBe(2)
    expect(resumen.usados).toBe(1)
    expect(resumen.vencidos).toBe(1)
  })

  it('un crédito usado con fecha pasada se cuenta como usado, NO como vencido', () => {
    const creditos = [{ id: 1, usado: true, fecha_vencimiento: '2020-01-01T00:00:00Z' }]
    const resumen = calcularResumen(creditos)
    expect(resumen.usados).toBe(1)
    expect(resumen.vencidos).toBe(0)
  })
})

describe('generaCredito: regla de 24 horas', () => {
  it('cancelar con exactamente 24hs de anticipación genera crédito', () => {
    const ahora = new Date()
    const claseEn24hs = new Date(ahora.getTime() + 24 * 60 * 60 * 1000)
    expect(generaCredito(ahora, claseEn24hs)).toBe(true)
  })

  it('cancelar con 25hs de anticipación genera crédito', () => {
    const ahora = new Date()
    const claseEn25hs = new Date(ahora.getTime() + 25 * 60 * 60 * 1000)
    expect(generaCredito(ahora, claseEn25hs)).toBe(true)
  })

  it('cancelar con 23:59hs de anticipación NO genera crédito', () => {
    const ahora = new Date()
    const claseEn23hs59 = new Date(ahora.getTime() + (24 * 60 * 60 - 60) * 1000)
    expect(generaCredito(ahora, claseEn23hs59)).toBe(false)
  })

  it('cancelar con 0 horas de anticipación NO genera crédito', () => {
    const ahora = new Date()
    const clasePasada = new Date(ahora.getTime() - 1000)
    expect(generaCredito(ahora, clasePasada)).toBe(false)
  })
})

describe('calcularMesVencimiento: arrastre de fin de mes', () => {
  it('clase en el día 10 vence en el mismo mes', () => {
    const clase = new Date('2026-11-10T20:00:00-03:00')
    const venc = calcularMesVencimiento(clase)
    expect(venc.getMonth()).toBe(10) // noviembre (0-indexed)
    expect(venc.getFullYear()).toBe(2026)
  })

  it('clase en el día 25 de noviembre (última semana) se arrastra a diciembre', () => {
    const clase = new Date('2026-11-25T20:00:00-03:00')
    const venc = calcularMesVencimiento(clase)
    expect(venc.getMonth()).toBe(11) // diciembre (0-indexed)
    expect(venc.getFullYear()).toBe(2026)
  })

  it('clase en el día 24 de noviembre (30 días - 6 = 24, última semana) se arrastra', () => {
    // Noviembre tiene 30 días. Última semana = días 24-30
    const clase = new Date('2026-11-24T20:00:00-03:00')
    const venc = calcularMesVencimiento(clase)
    expect(venc.getMonth()).toBe(11) // diciembre
  })

  it('clase en el día 23 de noviembre NO se arrastra', () => {
    // Día 23 = exactamente 7 días antes del 30 → NO es última semana
    const clase = new Date('2026-11-23T20:00:00-03:00')
    const venc = calcularMesVencimiento(clase)
    expect(venc.getMonth()).toBe(10) // noviembre
  })

  it('clase en diciembre 31 (último día del año) se arrastra a enero siguiente', () => {
    const clase = new Date('2026-12-31T20:00:00-03:00')
    const venc = calcularMesVencimiento(clase)
    expect(venc.getMonth()).toBe(0) // enero
    expect(venc.getFullYear()).toBe(2027)
  })
})
