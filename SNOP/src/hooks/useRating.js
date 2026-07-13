import { useState, useCallback } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('snop_token')}` },
})

// Clave de localStorage para turnos ya omitidos (no volver a preguntar en la sesión)
const OMITIDOS_KEY = 'snop_rating_omitidos'

function getOmitidos() {
  try { return JSON.parse(localStorage.getItem(OMITIDOS_KEY) || '[]') } catch { return [] }
}
function addOmitido(turnoId) {
  const prev = getOmitidos()
  if (!prev.includes(String(turnoId))) {
    localStorage.setItem(OMITIDOS_KEY, JSON.stringify([...prev, String(turnoId)]))
  }
}

export function useRating() {
  const [pendientes, setPendientes]   = useState([])   // turnos sin calificar
  const [turnoActual, setTurnoActual] = useState(null)  // el que se muestra ahora
  const [enviando,    setEnviando]    = useState(false)

  // Carga los turnos pendientes de calificar desde el servidor
  const cargarPendientes = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/ratings/pendientes`, authHeaders())
      const omitidos = getOmitidos()
      const lista = (data.data || []).filter(t => !omitidos.includes(String(t.turno_id)))
      setPendientes(lista)
      // Mostrar el primero automáticamente
      if (lista.length > 0) setTurnoActual(lista[0])
    } catch (err) {
      console.error('useRating — cargarPendientes:', err)
    }
  }, [])

  // Enviar calificación
  const enviarRating = useCallback(async ({ estrellas, comentario }) => {
    if (!turnoActual) return
    setEnviando(true)
    try {
      await axios.post(
        `${API_BASE}/ratings`,
        {
          entrenador_id: turnoActual.entrenador_id,
          turno_id:      turnoActual.turno_id,
          estrellas,
          comentario,
        },
        authHeaders()
      )
      // Sacar de la lista y pasar al siguiente
      setPendientes(prev => {
        const resto = prev.filter(t => t.turno_id !== turnoActual.turno_id)
        setTurnoActual(resto.length > 0 ? resto[0] : null)
        return resto
      })
    } catch (err) {
      // Si ya fue calificado (409) igual lo saca de la lista
      if (err.response?.status === 409) {
        setPendientes(prev => {
          const resto = prev.filter(t => t.turno_id !== turnoActual.turno_id)
          setTurnoActual(resto.length > 0 ? resto[0] : null)
          return resto
        })
      } else {
        throw err
      }
    } finally {
      setEnviando(false)
    }
  }, [turnoActual])

  // Omitir — no vuelve a aparecer en esta sesión
  const omitirRating = useCallback(() => {
    if (!turnoActual) return
    addOmitido(turnoActual.turno_id)
    setPendientes(prev => {
      const resto = prev.filter(t => t.turno_id !== turnoActual.turno_id)
      setTurnoActual(resto.length > 0 ? resto[0] : null)
      return resto
    })
  }, [turnoActual])

  return {
    pendientes,
    turnoActual,   // null = no hay nada para calificar
    enviando,
    cargarPendientes,
    enviarRating,
    omitirRating,
  }
}
