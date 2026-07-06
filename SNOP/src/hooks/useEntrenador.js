import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const getToken = () => localStorage.getItem('snop_token')

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${getToken()}` },
})

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
        axios.get(`${API_BASE}/entrenador/resumen-hoy`, authHeaders()),
        axios.get(`${API_BASE}/entrenador/solicitudes`, authHeaders()),
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

  useEffect(() => {
    cargar()
  }, [cargar])

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
      const { data } = await axios.get(
        `${API_BASE}/entrenador/mis-clases`,
        authHeaders()
      )
      setClases(data.data || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar clases')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const cancelarClase = async (turnoId) => {
    await axios.patch(
      `${API_BASE}/entrenador/clases/${turnoId}/cancelar`,
      {},
      authHeaders()
    )
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
      const { data } = await axios.get(
        `${API_BASE}/entrenador/mis-alumnos`,
        authHeaders()
      )
      setAlumnos(data.data || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar alumnos')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const cambiarNivel = async (alumnoId, nivelId) => {
    await axios.patch(
      `${API_BASE}/entrenador/alumnos/${alumnoId}/nivel`,
      { nivel_id: nivelId },
      authHeaders()
    )
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
      const { data } = await axios.get(
        `${API_BASE}/entrenador/alumnos/${alumnoId}`,
        authHeaders()
      )
      setAlumno(data.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar alumno')
    } finally {
      setCargando(false)
    }
  }, [alumnoId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const cambiarNivel = async (nivelId) => {
    await axios.patch(
      `${API_BASE}/entrenador/alumnos/${alumnoId}/nivel`,
      { nivel_id: nivelId },
      authHeaders()
    )
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
        axios.get(`${API_BASE}/entrenador/mis-horarios`, authHeaders()),
        axios.get(`${API_BASE}/entrenador/sedes`, authHeaders()),
      ])
      setHorarios(horariosRes.data.data || [])
      setSedes(sedesRes.data.data || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar horarios')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const agregarHorario = async ({ dia, hora, sede_id }) => {
    try {
      setGuardando(true)
      await axios.post(
        `${API_BASE}/entrenador/mis-horarios`,
        { dia, hora, sede_id },
        authHeaders()
      )
      await cargar()
    } finally {
      setGuardando(false)
    }
  }

  const cancelarHorario = async (turnoId) => {
    await axios.delete(
      `${API_BASE}/entrenador/mis-horarios/${turnoId}`,
      authHeaders()
    )
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
      const { data } = await axios.get(
        `${API_BASE}/entrenador/solicitudes`,
        authHeaders()
      )
      setSolicitudes(data.data || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar solicitudes')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const responderSolicitud = async (solicitudId, accion) => {
    // accion: 'confirmar' | 'rechazar'
    await axios.patch(
      `${API_BASE}/entrenador/solicitudes/${solicitudId}/${accion}`,
      {},
      authHeaders()
    )
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
      const { data } = await axios.get(
        `${API_BASE}/entrenador/perfil`,
        authHeaders()
      )
      setPerfil(data.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar perfil')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  return { perfil, cargando, error, recargar: cargar }
}

// ─── NIVELES ──────────────────────────────────────────────────────────────────

export function useNiveles() {
  const [niveles, setNiveles] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      try {
        const { data } = await axios.get(
          `${API_BASE}/entrenador/niveles`,
          authHeaders()
        )
        setNiveles(data.data || [])
      } catch (err) {
        console.error('Error al cargar niveles', err)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  return { niveles, cargando }
}

// ─── COMUNICADOS ENTRENADOR ───────────────────────────────────────────────────

export function useComunicadosEntrenador() {
  const [comunicados, setComunicados] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      try {
        const { data } = await axios.get(
          `${API_BASE}/entrenador/comunicados`,
          authHeaders()
        )
        setComunicados(data.data || [])
      } catch (err) {
        console.error('Error al cargar comunicados', err)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  return { comunicados, cargando }
}
