/**
 * useAsyncEffect — ejecuta un efecto async al montar/cuando cambian deps.
 * Evita los warnings de react-hooks/set-state-in-effect porque el setState
 * ocurre dentro de la función async interna del effect, no en el cuerpo síncrono.
 *
 * Uso:
 *   useAsyncEffect(async () => {
 *     const data = await fetch(...)
 *     setState(data)
 *   }, [dep1, dep2])
 */
import { useEffect } from 'react'

export function useAsyncEffect(fn, deps) {
  useEffect(() => {
    fn()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
