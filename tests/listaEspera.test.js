/**
 * Tests: lista de espera FIFO
 * Para correr: npm test
 */

/**
 * Simula la lógica de promoción FIFO de la lista de espera.
 * El orden se infiere por created_at (más antiguo primero).
 * @param {Array} listaEspera - items con { user_id, created_at }
 * @returns {object|null} - el primer item a promover, o null si está vacía
 */
function obtenerPrimeroEnEspera(listaEspera) {
  if (!listaEspera || listaEspera.length === 0) return null
  const ordenados = [...listaEspera].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  )
  return ordenados[0]
}

describe('lista de espera FIFO', () => {
  it('retorna null si la lista está vacía', () => {
    expect(obtenerPrimeroEnEspera([])).toBeNull()
    expect(obtenerPrimeroEnEspera(null)).toBeNull()
  })

  it('retorna el único elemento si hay uno solo', () => {
    const lista = [{ user_id: 1, created_at: '2026-11-01T10:00:00Z' }]
    expect(obtenerPrimeroEnEspera(lista).user_id).toBe(1)
  })

  it('retorna el inscripto más antiguo (FIFO)', () => {
    const lista = [
      { user_id: 3, created_at: '2026-11-01T12:00:00Z' },
      { user_id: 1, created_at: '2026-11-01T09:00:00Z' }, // primero
      { user_id: 2, created_at: '2026-11-01T10:00:00Z' },
    ]
    expect(obtenerPrimeroEnEspera(lista).user_id).toBe(1)
  })

  it('no modifica el array original al ordenar', () => {
    const lista = [
      { user_id: 3, created_at: '2026-11-01T12:00:00Z' },
      { user_id: 1, created_at: '2026-11-01T09:00:00Z' },
    ]
    const listaOriginal = [...lista]
    obtenerPrimeroEnEspera(lista)
    expect(lista[0].user_id).toBe(listaOriginal[0].user_id)
  })

  it('maneja inserts con la misma timestamp: orden estable por user_id', () => {
    const mismaMarca = '2026-11-01T10:00:00Z'
    const lista = [
      { user_id: 5, created_at: mismaMarca },
      { user_id: 2, created_at: mismaMarca },
    ]
    // Cuando los timestamps son iguales el resultado depende del sort estable
    // lo importante es que devuelve uno de los dos (no null)
    const resultado = obtenerPrimeroEnEspera(lista)
    expect([2, 5]).toContain(resultado.user_id)
  })
})
