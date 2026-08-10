import { createContext, useContext, useState, useEffect } from 'react'
import api from '../lib/apiClient.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

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

  async function login(email, password, tipo_usuario_id) {
    const { data } = await api.post('/auth/login', {
      email: email.trim().toLowerCase(),
      password,
      tipo_usuario_id,
    })

    const { token, user: perfil } = data

    localStorage.setItem('snop_token', token)
    localStorage.setItem('snop_user',  JSON.stringify(perfil))
    setUser(perfil)

    return perfil
  }

  // Permite actualizar el user en contexto + localStorage sin re-login
  // (útil cuando el admin cambia el nivel del socio)
  function actualizarUser(campos) {
    setUser(prev => {
      if (!prev) return prev
      const actualizado = { ...prev, ...campos }
      localStorage.setItem('snop_user', JSON.stringify(actualizado))
      return actualizado
    })
  }

  function logout() {
    setUser(null)
    localStorage.removeItem('snop_user')
    localStorage.removeItem('snop_token')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, actualizarUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
