import { useState, useEffect, useCallback } from 'react'
import api from '../lib/apiClient.js'
import { obtenerMensajeError } from '../lib/errores.js'

export function useHistorialPerfil() {
  const [items,    setItems]    = useState([])
  const [meta,     setMeta]     = useState({ page: 1, limit: 20, total: 0, paginas: 1 })
  const [cargando, setCargando] = useState(false)
  const [error,    setError]    = useState(null)
  const [filtros,  setFiltros]  = useState({ page: 1, mes: '', tipo: '' })

  const cargar = useCallback(async (params) => {
    const p = params ?? { page: 1, mes: '', tipo: '' }
    setCargando(true)
    setError(null)
    try {
      const query = { page: p.page ?? 1, limit: 20 }
      if (p.mes)  query.mes  = p.mes
      if (p.tipo) query.tipo = p.tipo
      const { data } = await api.get('/perfil/historial', { params: query })
      setItems(data.data ?? [])
      if (data.meta) setMeta(data.meta)
    } catch (err) {
      setError(obtenerMensajeError(err, 'Error al cargar historial'))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    async function init() { await cargar(filtros) }
    init()
  // cargar tiene deps vacías → estable; filtros es el dep real
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros])

  function cambiarFiltro(key, value) {
    setFiltros(prev => ({ ...prev, [key]: value, page: key === 'page' ? value : 1 }))
  }

  return { items, meta, cargando, error, filtros, cambiarFiltro, recargar: () => cargar(filtros) }
}
