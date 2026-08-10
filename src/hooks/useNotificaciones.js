import { useState, useEffect, useCallback } from 'react'
import { getNotificaciones, leerTodas, leerUna } from '../services/notificacionesApi.js'

export function useNotificaciones() {
  const [notificaciones, setNotificaciones] = useState([])
  const [noLeidas,       setNoLeidas]       = useState(0)
  const [cargando,       setCargando]       = useState(true)

  const cargar = useCallback(async () => {
    try {
      const { data, no_leidas } = await getNotificaciones()
      setNotificaciones(data ?? [])
      setNoLeidas(no_leidas ?? 0)
    } catch (err) {
      console.error('useNotificaciones:', err)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const marcarTodas = useCallback(async () => {
    try {
      await leerTodas()
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
      setNoLeidas(0)
    } catch (err) {
      console.error(err)
    }
  }, [])

  const marcarUna = useCallback(async (id) => {
    try {
      await leerUna(id)
      setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
      setNoLeidas(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error(err)
    }
  }, [])

  return { notificaciones, noLeidas, cargando, cargar, marcarTodas, marcarUna }
}
