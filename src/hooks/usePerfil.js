import { useEffect, useState } from 'react'
import api from '../lib/apiClient.js'

export const usePerfil = () => {
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargarPerfil = async () => {
    try {
      setCargando(true)
      setError(null)
      const { data } = await api.get('/perfil')
      setPerfil(data.data)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || 'Error al cargar el perfil')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarPerfil()
  }, [])

  return { perfil, cargando, error, cargarPerfil }
}
