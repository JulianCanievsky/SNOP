import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const getToken = () => localStorage.getItem('snop_token')

const auth = () => ({ headers: { Authorization: `Bearer ${getToken()}` } })

// Stats
export const getStats         = ()       => axios.get(`${API_BASE}/admin/stats`, auth()).then(r => r.data.data)

// Socios
export const getSocios        = (params) => axios.get(`${API_BASE}/admin/socios`, { ...auth(), params }).then(r => r.data.data)
export const getSocio         = (id)     => axios.get(`${API_BASE}/admin/socios/${id}`, auth()).then(r => r.data.data)
export const crearSocio       = (body)   => axios.post(`${API_BASE}/admin/socios`, body, auth()).then(r => r.data)
export const editarSocio      = (id, b)  => axios.patch(`${API_BASE}/admin/socios/${id}`, b, auth()).then(r => r.data)

// Entrenadores
export const getEntrenadores  = ()       => axios.get(`${API_BASE}/admin/entrenadores`, auth()).then(r => r.data.data)

// Sedes — versión admin (con token) y versión pública (sin token, para socios)
export const getSedes         = ()       => axios.get(`${API_BASE}/admin/sedes`, auth()).then(r => r.data.data)
export const getSedesPublicas = ()       => axios.get(`${API_BASE}/sedes`).then(r => r.data.data)

// Niveles
export const getNiveles       = ()       => axios.get(`${API_BASE}/admin/niveles`, auth()).then(r => r.data.data)
export const getNivelesStats  = ()       => axios.get(`${API_BASE}/admin/niveles/stats`, auth()).then(r => r.data.data)

// Comunicados
export const getComunicados   = ()       => axios.get(`${API_BASE}/admin/comunicados`, auth()).then(r => r.data.data)
export const enviarComunicado = (body)   => axios.post(`${API_BASE}/admin/comunicados`, body, auth()).then(r => r.data)

// Config
export const getConfig        = ()       => axios.get(`${API_BASE}/admin/config`, auth()).then(r => r.data.data)

// Juego libre
export const getJuegosLibres  = ()       => axios.get(`${API_BASE}/admin/juego-libre`, auth()).then(r => r.data.data)
export const crearJuegoLibre  = (body)   => axios.post(`${API_BASE}/admin/juego-libre`, body, auth()).then(r => r.data)
export const borrarJuegoLibre = (id)     => axios.delete(`${API_BASE}/admin/juego-libre/${id}`, auth()).then(r => r.data)
