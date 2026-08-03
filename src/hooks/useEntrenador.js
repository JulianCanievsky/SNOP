import { useState, useEffect, useCallback } from 'react'
import api from '../lib/apiClient.js'

// ─── INICIO ──────────────────────────────────────────────────────────────────

export function useInicioEntrenador() {
  const [resumen, setResumen] = useState(null)
  const [solicitudesPendientes, setSolicitudesPendientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargar = useCallback(async () => {
    try {
      setCargando(true)
      setError(null)
      const [resumenRes, solicitudesRes] = await Promise.all([
        api.get('/entrenador/resumen-hoy'),
        api.get('/entrenador/solicitudes'),
      ])
      setResumen(resumenRes.data.data)
      setSolicitudesPendientes(
        (solicitudesRes.data.data || []).filter((s) => s.estado === 'pendiente')
      )
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar inicio')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  return { resumen, solicitudesPendientes, cargando, error, recargar: cargar }
}

// ─── MIS CLASES ──────────────────────────────────────────────────────────────

export function useMisClasesEntrenador() {
  const [clases, setClases] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargar = useCallback(async () => {
    try {
      setCargando(true)
      setError(null)
      const { data } = await api.get('/entrenador/mis-clases')
      setClases(data.data || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar clases')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const cancelarClase = async (turnoId) => {
    await api.patch(`/entrenador/clases/${turnoId}/cancelar`, {})
    await cargar()
  }

  return { clases, cargando, error, recargar: cargar, cancelarClase }
}

// ─── MIS ALUMNOS ─────────────────────────────────────────────────────────────

export function useMisAlumnos() {
  const [alumnos, setAlumnos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargar = useCallback(async () => {
    try {
      setCargando(true)
      setError(null)
      const { data } = await api.get('/entrenador/mis-alumnos')
      setAlumnos(data.data || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar alumnos')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const cambiarNivel = async (alumnoId, nivelId) => {
    await api.patch(`/entrenador/alumnos/${alumnoId}/nivel`, { nivel_id: nivelId })
    await cargar()
  }

  return { alumnos, cargando, error, recargar: cargar, cambiarNivel }
}

// ─── DETALLE ALUMNO ───────────────────────────────────────────────────────────

export function useDetalleAlumno(alumnoId) {
  const [alumno, setAlumno] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargar = useCallback(async () => {
    if (!alumnoId) return
    try {
      setCargando(true)
      setError(null)
      const { data } = await api.get(`/entrenador/alumnos/${alumnoId}`)
      setAlumno(data.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar alumno')
    } finally {
      setCargando(false)
    }
  }, [alumnoId])

  useEffect(() => { cargar() }, [cargar])

  const cambiarNivel = async (nivelId) => {
    await api.patch(`/entrenador/alumnos/${alumnoId}/nivel`, { nivel_id: nivelId })
    await cargar()
  }

  return { alumno, cargando, error, recargar: cargar, cambiarNivel }
}

// ─── MIS HORARIOS ─────────────────────────────────────────────────────────────

export function useMisHorarios() {
  const [horarios, setHorarios] = useState([])
  const [sedes, setSedes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    try {
      setCargando(true)
      setError(null)
      const [horariosRes, sedesRes] = await Promise.all([
        api.get('/entrenador/mis-horarios'),
        api.get('/entrenador/sedes'),
      ])
      setHorarios(horariosRes.data.data || [])
      setSedes(sedesRes.data.data || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar horarios')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const agregarHorario = async ({ dia, hora, sede_id, duracion_min }) => {
    try {
      setGuardando(true)
      await api.post('/entrenador/mis-horarios', { dia, hora, sede_id, duracion_min })
      await cargar()
    } finally {
      setGuardando(false)
    }
  }

  const cancelarHorario = async (turnoId) => {
    await api.delete(`/entrenador/mis-horarios/${turnoId}`)
    await cargar()
  }

  return { horarios, sedes, cargando, error, guardando, recargar: cargar, agregarHorario, cancelarHorario }
}

// ─── SOLICITUDES ──────────────────────────────────────────────────────────────

export function useSolicitudesEntrenador() {
  const [solicitudes, setSolicitudes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargar = useCallback(async () => {
    try {
      setCargando(true)
      setError(null)
      const { data } = await api.get('/entrenador/solicitudes')
      setSolicitudes(data.data || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar solicitudes')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const responderSolicitud = async (solicitudId, accion) => {
    await api.patch(`/entrenador/solicitudes/${solicitudId}/${accion}`, {})
    await cargar()
  }

  return { solicitudes, cargando, error, recargar: cargar, responderSolicitud }
}

// ─── PERFIL ENTRENADOR ────────────────────────────────────────────────────────

export function usePerfilEntrenador() {
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargar = useCallback(async () => {
    try {
      setCargando(true)
      setError(null)
      const { data } = await api.get('/entrenador/perfil')
      setPerfil(data.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar perfil')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  return { perfil, cargando, error, recargar: cargar }
}

// ─── NIVELES ──────────────────────────────────────────────────────────────────

export function useNiveles() {
  const [niveles, setNiveles] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    api
      .get('/entrenador/niveles')
      .then(({ data }) => setNiveles(data.data || []))
      .catch((err) => console.error('Error al cargar niveles', err))
      .finally(() => setCargando(false))
  }, [])

  return { niveles, cargando }
}

// ─── COMUNICADOS ENTRENADOR ───────────────────────────────────────────────────

export function useComunicadosEntrenador() {
  const [comunicados, setComunicados] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    api
      .get('/entrenador/comunicados')
      .then(({ data }) => setComunicados(data.data || []))
      .catch((err) => console.error('Error al cargar comunicados', err))
      .finally(() => setCargando(false))
  }, [])

  return { comunicados, cargando }
}
