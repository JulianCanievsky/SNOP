import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restaurar sesión desde localStorage al cargar
  useEffect(() => {
    const stored = localStorage.getItem('snop_user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('snop_user')
      }
    }
    setLoading(false)
  }, [])

  /**
   * Login: busca el usuario en la tabla `users` con email + password
   * y valida que el tipo_usuario_id coincida con el rol seleccionado.
   * tipo_usuario_id: 1=socio, 2=entrenador, 3=admin
   */
  async function login(email, password, tipoUsuarioId) {
    const { data, error } = await supabase
      .from('users')
      .select('id, nombre, email, tipo_usuario_id, club_id, activo, cuota_al_dia, foto_url')
      .eq('email', email.trim().toLowerCase())
      .eq('password', password)
      .single()

    if (error || !data) {
      throw new Error('Correo o contraseña incorrectos')
    }

    if (!data.activo) {
      throw new Error('Tu cuenta está desactivada. Contactá al club.')
    }

    if (data.tipo_usuario_id !== tipoUsuarioId) {
      const roles = { 1: 'Socio', 2: 'Entrenador', 3: 'Administrador' }
      throw new Error(`Este correo no corresponde al rol ${roles[tipoUsuarioId]}`)
    }

    const userData = { ...data }
    setUser(userData)
    localStorage.setItem('snop_user', JSON.stringify(userData))
    return userData
  }

  function logout() {
    setUser(null)
    localStorage.removeItem('snop_user')
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
