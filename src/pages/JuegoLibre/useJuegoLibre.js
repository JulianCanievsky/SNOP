import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/apiClient.js'
import { obtenerMensajeError } from '../../lib/errores.js'

export const useJuegoLibre = () => {
  const [eventos, setEventos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargarEventos = useCallback(async (filtros = {}) => {
    try {
      setCargando(true)
      setError(null)
      const params = new URLSearchParams()
      if (filtros.sede_id) params.append('sede_id', filtros.sede_id)
      if (filtros.fecha) params.append('fecha', filtros.fecha)

      const { data } = await api.get(`/juego-libre?${params}`)
      // El backend responde { ok, data: [...] } — leer data.data
      setEventos(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []))
    } catch (err) {
      setError(obtenerMensajeError(err, 'Error al cargar los eventos'))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarEventos()
  }, [cargarEventos])

  const inscribirse = async (eventoId) => {
    const { data } = await api.post(`/juego-libre/${eventoId}/inscribir`, {})
    return data
  }

  const cancelarInscripcion = async (eventoId) => {
    const { data } = await api.delete(`/juego-libre/${eventoId}/cancelar`)
    return data
  }

  return { eventos, cargando, error, cargarEventos, inscribirse, cancelarInscripcion }
}
