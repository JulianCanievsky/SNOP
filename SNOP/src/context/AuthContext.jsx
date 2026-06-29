import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

async function fetchUserProfile(email) {
  const { data, error } = await supabase
    .from('users')
    .select('id, nombre, email, tipo_usuario_id, club_id, activo, cuota_al_dia, foto_url')
    .eq('email', email.trim().toLowerCase())
    .single()

  if (error || !data) {
    throw new Error('No se encontró el perfil del usuario')
  }

  return data
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user?.email) {
        try {
          const profile = await fetchUserProfile(session.user.email)
          if (profile.activo) {
            setUser(profile)
            localStorage.setItem('snop_user', JSON.stringify(profile))
            localStorage.setItem('snop_token', session.access_token)
          }
        } catch {
          await supabase.auth.signOut()
        }
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user?.email) {
        try {
          const profile = await fetchUserProfile(session.user.email)
          setUser(profile)
          localStorage.setItem('snop_user', JSON.stringify(profile))
          localStorage.setItem('snop_token', session.access_token)
        } catch {
          setUser(null)
          localStorage.removeItem('snop_user')
          localStorage.removeItem('snop_token')
        }
      } else {
        setUser(null)
        localStorage.removeItem('snop_user')
        localStorage.removeItem('snop_token')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function login(email, password, tipoUsuarioId) {
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (authError) {
      throw new Error('Correo o contraseña incorrectos')
    }

    const data = await fetchUserProfile(email)

    if (!data.activo) {
      await supabase.auth.signOut()
      throw new Error('Tu cuenta está desactivada. Contactá al club.')
    }

    if (data.tipo_usuario_id !== tipoUsuarioId) {
      await supabase.auth.signOut()
      const roles = { 1: 'Socio', 2: 'Entrenador', 3: 'Administrador' }
      throw new Error(`Este correo no corresponde al rol ${roles[tipoUsuarioId]}`)
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      localStorage.setItem('snop_token', session.access_token)
    }

    setUser(data)
    localStorage.setItem('snop_user', JSON.stringify(data))
    return data
  }

  async function logout() {
    await supabase.auth.signOut()
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
