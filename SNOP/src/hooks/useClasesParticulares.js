import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const getToken = () => localStorage.getItem('snop_token')

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${getToken()}` },
})

export const useClasesParticulares = () => {
  const [entrenadores, setEntrenadores] = useState([])
  const [solicitudes, setSolicitudes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargarEntrenadores = useCallback(async () => {
    try {
      setCargando(true)
      setError(null)
      const { data } = await axios.get(
        `${API_BASE}/clases-particulares/entrenadores`
        // entrenadores es público — no requiere auth
      )
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
      const { data } = await axios.get(
        `${API_BASE}/clases-particulares/mis-solicitudes`,
        authHeaders()
      )
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
    const { data } = await axios.get(
      `${API_BASE}/clases-particulares/entrenadores/${entrenadorId}`
    )
    return data.data
  }

  const enviarSolicitud = async ({ entrenador_id, turno_id, mensaje }) => {
    const { data } = await axios.post(
      `${API_BASE}/clases-particulares/solicitar`,
      { entrenador_id, turno_id, mensaje },
      authHeaders()
    )
    await obtenerSolicitudes()
    await cargarEntrenadores()
    return data
  }

  const liberarSolicitud = async (solicitudId) => {
    await axios.delete(
      `${API_BASE}/clases-particulares/liberar/${solicitudId}`,
      authHeaders()
    )
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
