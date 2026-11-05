/**
 * socioTurnoService — único módulo que escribe en socio_turno.
 * Se mockea el cliente Supabase: solo se prueba la validación y que
 * estado (boolean) y estado_texto viajen siempre juntos.
 */
import { vi } from 'vitest'

const insertado = []
const actualizado = []

// Query builder falso: registra lo que se escribe y devuelve esa misma fila
vi.mock('../src/config/db.js', () => ({
  default: {
    from: () => {
      let fila = null
      const q = {
        insert(f) { fila = f; insertado.push(f); return q },
        update(f) { fila = f; actualizado.push(f); return q },
        eq()      { return q },
        select()  { return q },
        single: async () => ({ data: fila, error: null }),
      }
      return q
    },
  },
}))

const svc = await import('../src/services/socioTurnoService.js')

describe('socioTurnoService', () => {
  it('rechaza un estado_texto inválido sin tocar la BD', async () => {
    const antes = insertado.length
    await expect(
      svc.crearInscripcion({ turno_id: 1, user_id: 2, estado_texto: 'confirmado' })
    ).rejects.toThrow(/Estado inválido/)
    expect(insertado.length).toBe(antes)
  })

  it('crearInscripcion escribe estado boolean coherente con estado_texto', async () => {
    await svc.crearInscripcion({ turno_id: 1, user_id: 2, estado_texto: 'activo' })
    expect(insertado.at(-1)).toMatchObject({ estado: true, estado_texto: 'activo' })

    await svc.crearInscripcion({ turno_id: 1, user_id: 3, estado_texto: 'pendiente' })
    expect(insertado.at(-1)).toMatchObject({ estado: false, estado_texto: 'pendiente' })
  })

  it.each([
    ['cancelado_a_tiempo', false],
    ['cancelado_tarde',    false],
    ['baja_entrenador',    false],
    ['activo',             true],
  ])('actualizarEstadoPorId(%s) → estado=%s', async (estado_texto, esperado) => {
    await svc.actualizarEstadoPorId({ socioTurnoId: 10, estado_texto })
    expect(actualizado.at(-1)).toEqual({ estado: esperado, estado_texto })
  })
})
