/**
 * apiClient.js — cliente HTTP centralizado para el frontend.
 *
 * Exporta:
 *   - api          → instancia de axios preconfigurada (base URL + token automático)
 *   - authHeaders  → helper por si algún componente necesita los headers sueltos
 *   - API_BASE     → la URL base (para casos que usen fetch directamente, evitar duplicación)
 */
import axios from 'axios'

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

/** Devuelve el token almacenado en localStorage */
const getToken = () => localStorage.getItem('snop_token')

/** Objeto de headers de autorización — útil como fallback */
export const authHeaders = () => ({
  headers: { Authorization: `Bearer ${getToken()}` },
})

/** Instancia de axios con base URL y token inyectado en cada request */
const api = axios.create({ baseURL: API_BASE })

// Interceptor: adjunta el token en cada request si existe
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor de respuesta: si el servidor devuelve 401 limpia la sesión
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido — limpiar sesión sin ciclo de redirección
      localStorage.removeItem('snop_token')
      localStorage.removeItem('snop_user')
      // Solo redirigir si no estamos ya en /login
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
