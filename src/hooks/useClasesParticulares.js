import { useState, useEffect, useCallback } from 'react'
import api from '../lib/apiClient.js'

export const useClasesParticulares = () => {
  const [entrenadores, setEntrenadores] = useState([])
  const [solicitudes, setSolicitudes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargarEntrenadores = useCallback(async () => {
    try {
      setCargando(true)
      setError(null)
      // endpoint público — el interceptor omite el token si no hay sesión
      const { data } = await api.get('/clases-particulares/entrenadores')
      setEntrenadores(data.data || [])
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || 'Error al cargar entrenadores')
    } finally {
      setCargando(false)
    }
  }, [])

  const obtenerSolicitudes = useCallback(async () => {
    try {
      const { data } = await api.get('/clases-particulares/mis-solicitudes')
      setSolicitudes(data.data || [])
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    cargarEntrenadores()
    obtenerSolicitudes()
  }, [cargarEntrenadores, obtenerSolicitudes])

  const obtenerEntrenador = async (entrenadorId) => {
    const { data } = await api.get(`/clases-particulares/entrenadores/${entrenadorId}`)
    return data.data
  }

  const enviarSolicitud = async ({ entrenador_id, turno_id, mensaje }) => {
    const { data } = await api.post('/clases-particulares/solicitar', {
      entrenador_id,
      turno_id,
      mensaje,
    })
    await obtenerSolicitudes()
    await cargarEntrenadores()
    return data
  }

  const liberarSolicitud = async (solicitudId) => {
    await api.delete(`/clases-particulares/liberar/${solicitudId}`)
    await obtenerSolicitudes()
    await cargarEntrenadores()
  }

  return {
    entrenadores,
    solicitudes,
    cargando,
    error,
    cargarEntrenadores,
    obtenerEntrenador,
    enviarSolicitud,
    obtenerSolicitudes,
    liberarSolicitud,
  }
}
