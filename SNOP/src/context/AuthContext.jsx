import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // Al arrancar, restaura la sesión desde localStorage
  useEffect(() => {
    const storedUser  = localStorage.getItem('snop_user')
    const storedToken = localStorage.getItem('snop_token')

    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('snop_user')
        localStorage.removeItem('snop_token')
      }
    }
    setLoading(false)
  }, [])

  // ─── login ───────────────────────────────────────────────────────────────
  async function login(email, password, tipo_usuario_id) {
    const { data } = await axios.post(`${API_BASE}/auth/login`, {
      email: email.trim().toLowerCase(),
      password,
      tipo_usuario_id,
    })

    const { token, user: perfil } = data

    localStorage.setItem('snop_token', token)
    localStorage.setItem('snop_user', JSON.stringify(perfil))
    setUser(perfil)

    return perfil
  }

  // ─── logout ──────────────────────────────────────────────────────────────
  function logout() {
    setUser(null)
    localStorage.removeItem('snop_user')
    localStorage.removeItem('snop_token')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
