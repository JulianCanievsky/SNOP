import { useState, useCallback } from 'react'
import api from '../lib/apiClient.js'

// Clave de localStorage para turnos ya omitidos (no volver a preguntar en la sesión)
const OMITIDOS_KEY = 'snop_rating_omitidos'

function getOmitidos() {
  try {
    return JSON.parse(localStorage.getItem(OMITIDOS_KEY) || '[]')
  } catch {
    return []
  }
}

function addOmitido(turnoId) {
  const prev = getOmitidos()
  if (!prev.includes(String(turnoId))) {
    localStorage.setItem(OMITIDOS_KEY, JSON.stringify([...prev, String(turnoId)]))
  }
}

export function useRating() {
  const [pendientes, setPendientes] = useState([])
  const [turnoActual, setTurnoActual] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const cargarPendientes = useCallback(async () => {
    try {
      const { data } = await api.get('/ratings/pendientes')
      const omitidos = getOmitidos()
      const lista = (data.data || []).filter(
        (t) => !omitidos.includes(String(t.turno_id))
      )
      setPendientes(lista)
      if (lista.length > 0) setTurnoActual(lista[0])
    } catch (err) {
      console.error('useRating — cargarPendientes:', err)
    }
  }, [])

  const enviarRating = useCallback(
    async ({ estrellas, comentario }) => {
      if (!turnoActual) return
      setEnviando(true)
      try {
        await api.post('/ratings', {
          entrenador_id: turnoActual.entrenador_id,
          turno_id: turnoActual.turno_id,
          estrellas,
          comentario,
        })
        setPendientes((prev) => {
          const resto = prev.filter((t) => t.turno_id !== turnoActual.turno_id)
          setTurnoActual(resto.length > 0 ? resto[0] : null)
          return resto
        })
      } catch (err) {
        // 409 = ya calificado — igual lo sacamos de la lista
        if (err.response?.status === 409) {
          setPendientes((prev) => {
            const resto = prev.filter((t) => t.turno_id !== turnoActual.turno_id)
            setTurnoActual(resto.length > 0 ? resto[0] : null)
            return resto
          })
        } else {
          throw err
        }
      } finally {
        setEnviando(false)
      }
    },
    [turnoActual]
  )

  const omitirRating = useCallback(() => {
    if (!turnoActual) return
    addOmitido(turnoActual.turno_id)
    setPendientes((prev) => {
      const resto = prev.filter((t) => t.turno_id !== turnoActual.turno_id)
      setTurnoActual(resto.length > 0 ? resto[0] : null)
      return resto
    })
  }, [turnoActual])

  return {
    pendientes,
    turnoActual,
    enviando,
    cargarPendientes,
    enviarRating,
    omitirRating,
  }
}
