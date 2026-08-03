import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import './ResetPassword.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export default function ResetPassword() {
  const [searchParams]    = useSearchParams()
  const navigate          = useNavigate()
  const token             = searchParams.get('token')

  const [password,   setPassword]   = useState('')
  const [confirmar,  setConfirmar]  = useState('')
  const [verPw,      setVerPw]      = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [exito,      setExito]      = useState(false)
  const [error,      setError]      = useState('')

  // Token inválido o ausente
  if (!token) {
    return (
      <div className="rp-container">
        <div className="rp-card">
          <div className="rp-error-card">
            <span className="rp-error-icono">⚠️</span>
            <h3>Link inválido</h3>
            <p>Este link no es válido o ya fue utilizado.</p>
            <Link to="/forgot-password" className="rp-btn-nuevo">Solicitar nuevo link</Link>
          </div>
        </div>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!password) { setError('Ingresá una contraseña'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (password !== confirmar) { setError('Las contraseñas no coinciden'); return }

    setLoading(true)
    try {
      await axios.post(`${API_BASE}/auth/reset-password`, { token, password })
      setExito(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al restablecer la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rp-container">
      <div className="rp-header">
        <Link to="/login" className="rp-btn-volver">‹ Volver</Link>
      </div>

      <div className="rp-hero">
        <h2>Nueva contraseña</h2>
        <p>Ingresá tu nueva contraseña</p>
      </div>

      <div className="rp-card">
        {exito ? (
          <div className="rp-exito">
            <div className="rp-exito-icono">✅</div>
            <h3>¡Contraseña actualizada!</h3>
            <p>Tu contraseña fue cambiada correctamente. Redirigiendo al inicio de sesión...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="rp-error">{error}</div>}

            <div className="rp-form-group">
              <label htmlFor="password">Nueva contraseña</label>
              <div className="rp-input-wrapper">
                <input
                  id="password"
                  type={verPw ? 'text' : 'password'}
                  className="rp-input"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  className="rp-toggle-ver"
                  onClick={() => setVerPw(v => !v)}
                  aria-label={verPw ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {verPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="rp-form-group">
              <label htmlFor="confirmar">Confirmar contraseña</label>
              <input
                id="confirmar"
                type={verPw ? 'text' : 'password'}
                className="rp-input"
                placeholder="Repetí la contraseña"
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
              />
            </div>

            {/* Indicador de fortaleza */}
            {password.length > 0 && (
              <div className="rp-fortaleza">
                <div className={`rp-fortaleza-barra ${password.length < 6 ? 'debil' : password.length < 10 ? 'media' : 'fuerte'}`} />
                <span className="rp-fortaleza-label">
                  {password.length < 6 ? 'Muy corta' : password.length < 10 ? 'Aceptable' : 'Segura'}
                </span>
              </div>
            )}

            <button type="submit" className="rp-btn-submit" disabled={loading}>
              {loading ? <><span className="rp-spinner" /> Guardando...</> : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
