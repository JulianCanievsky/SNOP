import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import './ForgotPassword.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Ingresá tu correo electrónico'); return }

    setLoading(true)
    try {
      await axios.post(`${API_BASE}/auth/forgot-password`, {
        email: email.trim().toLowerCase(),
      })
      setEnviado(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fp-container">
      <div className="fp-header">
        <Link to="/login" className="fp-btn-volver">‹ Volver</Link>
      </div>

      <div className="fp-hero">
        <h2>Olvidé mi contraseña</h2>
        <p>Te enviamos un link para que puedas restablecerla</p>
      </div>

      <div className="fp-card">
        {enviado ? (
          <div className="fp-exito">
            <div className="fp-exito-icono">✉️</div>
            <h3>Revisá tu correo</h3>
            <p>
              Si el correo <strong>{email}</strong> está registrado, vas a recibir
              un link para restablecer tu contraseña en los próximos minutos.
            </p>
            <p className="fp-exito-sub">Revisá también la carpeta de spam.</p>
            <Link to="/login" className="fp-btn-login">Volver al inicio de sesión</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="fp-error">{error}</div>}

            <div className="fp-form-group">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                className="fp-input"
                placeholder="tu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>

            <button type="submit" className="fp-btn-submit" disabled={loading}>
              {loading ? <><span className="fp-spinner" /> Enviando...</> : 'Enviar link de recuperación'}
            </button>

            <Link to="/login" className="fp-link-volver">Volver al inicio de sesión</Link>
          </form>
        )}
      </div>
    </div>
  )
}
