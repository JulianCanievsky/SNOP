import { useEffect, useState } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const getToken = () => localStorage.getItem('snop_token')

export const usePerfil = () => {
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)

  const cargarPerfil = async () => {
    try {
      setCargando(true)
      const { data } = await axios.get(`${API_BASE}/perfil`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      setPerfil(data.data)
    } catch (error) {
      console.error(error)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarPerfil()
  }, [])

  return { perfil, cargando, cargarPerfil }
}
