import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './login.css'

// tipo_usuario_id según tabla tipo_usuario
const ROLES = [
  { id: 1, label: 'Socio',       titulo: 'Bienvenido Socio',          subtitulo: 'Iniciá sesión en tu club' },
  { id: 2, label: 'Entrenador',  titulo: 'Bienvenido Entrenador',     subtitulo: 'Iniciá sesión en tu club' },
  { id: 3, label: 'Admin',       titulo: 'Bienvenido Administrador',  subtitulo: 'Iniciá sesión en tu club' },
]

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [rolActivo, setRolActivo] = useState(0) // índice en ROLES
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const rol = ROLES[rolActivo]

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Completá todos los campos')
      return
    }

    setLoading(true)
    try {
      const userData = await login(email, password, rol.id)

      // Redirigir según tipo
      if (userData.tipo_usuario_id === 3) {
        navigate('/admin')
      } else if (userData.tipo_usuario_id === 2) {
        navigate('/entrenador')
      } else {
        navigate('/mis-turnos')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      {/* Header */}
      <div className="login-header">
        <button className="btn-volver" onClick={() => navigate('/')}>
          ‹ volver
        </button>
      </div>

      {/* Hero */}
      <div className="login-hero">
        <h2>{rol.titulo}</h2>
        <p>{rol.subtitulo}</p>
      </div>

      {/* Tabs */}
      <div className="login-tabs">
        {ROLES.map((r, i) => (
          <button
            key={r.id}
            className={`tab-btn ${rolActivo === i ? 'active' : ''}`}
            onClick={() => { setRolActivo(i); setError('') }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Card con formulario */}
      <div className="login-card">
        <form onSubmit={handleSubmit}>
          {error && <div className="error-box">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <span className="link-forgot">¿Olvidaste tu contraseña?</span>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading && <span className="spinner" />}
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        {rol.id === 1 && (
          <p className="login-footer">
            ¿No tenés cuenta?{' '}
            <Link to="/registro">Registrate</Link>
          </p>
        )}
      </div>
    </div>
  )
}
