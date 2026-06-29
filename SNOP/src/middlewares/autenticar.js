import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

// Cliente con service key para poder verificar tokens
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function autenticar(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' })
  }

  const token = authHeader.split(' ')[1]

  try {
    // Verifica el token contra Supabase (usa el JWT secret de Supabase internamente)
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido o expirado' })
    }

    // Busca el perfil en la tabla users usando el email del token
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email.trim().toLowerCase())
      .single()

    if (profileError || !profile) {
      return res.status(401).json({ error: 'Usuario no encontrado' })
    }

    req.userId = profile.id
    next()
  } catch (err) {
    console.error('Error en autenticar:', err)
    return res.status(401).json({ error: 'Error de autenticación' })
  }
}
