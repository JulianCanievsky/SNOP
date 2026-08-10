import { useState, useEffect, useCallback } from 'react'
import { getResumenBonos, cancelarConCredito, getTurnosParaReprog, reprogramarClase } from '../services/bonosApi.js'

export function useBonos() {
  const [resumen,          setResumen]          = useState(null)
  const [turnosDisp,       setTurnosDisp]       = useState([])
  const [cargando,         setCargando]         = useState(true)
  const [cargandoTurnos,   setCargandoTurnos]   = useState(false)
  const [error,            setError]            = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const data = await getResumenBonos()
      setResumen(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar bonos')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const cargarTurnosReprog = useCallback(async () => {
    setCargandoTurnos(true)
    try {
      const data = await getTurnosParaReprog()
      setTurnosDisp(data ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setCargandoTurnos(false)
    }
  }, [])

  const cancelar = useCallback(async (socioTurnoId) => {
    const res = await cancelarConCredito(socioTurnoId)
    await cargar() // refrescar resumen
    return res
  }, [cargar])

  const reprogramar = useCallback(async (creditoId, turnoId) => {
    const res = await reprogramarClase({ credito_id: creditoId, turno_id: turnoId })
    await cargar()
    return res
  }, [cargar])

  return {
    resumen,
    turnosDisp,
    cargando,
    cargandoTurnos,
    error,
    cargar,
    cargarTurnosReprog,
    cancelar,
    reprogramar,
  }
}
