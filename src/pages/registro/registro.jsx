import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/apiClient.js'
import './registro.css'

export default function Registro() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    nombre:          '',
    email:           '',
    password:        '',
    confirmPassword: '',
    club_id:         '',
  })
  const [clubes,  setClubes]  = useState([])
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/auth/clubes')
      .then(r => setClubes(r.data.data ?? []))
      .catch(() => setClubes([]))
  }, [])

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const { nombre, email, password, confirmPassword, club_id } = form

    if (!nombre.trim() || !email.trim() || !password.trim() || !confirmPassword.trim() || !club_id) {
      setError('Completá todos los campos, incluyendo el club')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/auth/registro', {
        nombre:   nombre.trim(),
        email:    email.trim().toLowerCase(),
        password,
        club_id:  Number(club_id),
      })

      setSuccess(data.mensaje || '¡Solicitud enviada! El admin del club te aprobará pronto.')
      setForm({ nombre: '', email: '', password: '', confirmPassword: '', club_id: '' })

      // Si la cuenta queda pendiente no redirigimos al login todavía
      if (!data.pendiente) {
        setTimeout(() => navigate('/login'), 2500)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="registro-container">
      <div className="registro-header">
        <button className="btn-volver" onClick={() => navigate('/')}>
          ‹ volver
        </button>
      </div>

      <div className="registro-hero">
        <h2>Crear cuenta</h2>
        <p>El admin del club aprobará tu solicitud</p>
      </div>

      <div className="registro-card">
        <form onSubmit={handleSubmit}>
          {error   && <div className="error-box">{error}</div>}
          {success && <div className="success-box">{success}</div>}

          <div className="form-group">
            <label htmlFor="nombre">Nombre completo</label>
            <input id="nombre" name="nombre" type="text" className="form-input"
              placeholder="Nombre y apellido" value={form.nombre}
              onChange={handleChange} autoComplete="name" />
          </div>

          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <input id="email" name="email" type="email" className="form-input"
              placeholder="tu@email.com" value={form.email}
              onChange={handleChange} autoComplete="email" />
          </div>

          {/* Selector de club */}
          <div className="form-group">
            <label htmlFor="club_id">Club al que querés unirte</label>
            <select
              id="club_id"
              name="club_id"
              className="form-input"
              value={form.club_id}
              onChange={handleChange}
              style={{ appearance: 'auto' }}
            >
              <option value="">Seleccioná un club...</option>
              {clubes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" className="form-input"
              placeholder="••••••••" value={form.password}
              onChange={handleChange} autoComplete="new-password" />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar contraseña</label>
            <input id="confirmPassword" name="confirmPassword" type="password" className="form-input"
              placeholder="••••••••" value={form.confirmPassword}
              onChange={handleChange} autoComplete="new-password" />
          </div>

          <div className="info-box">
            Tu solicitud será revisada por el administrador del club. Te avisaremos por email cuando se apruebe.
          </div>

          <button type="submit" className="btn-registro" disabled={loading}>
            {loading && <span className="spinner" />}
            {loading ? 'Enviando solicitud...' : 'Solicitar ingreso'}
          </button>
        </form>

        {success && (
          <button
            className="btn-registro"
            style={{ marginTop: 12, background: 'transparent', border: '2px solid #2563eb', color: '#2563eb' }}
            onClick={() => navigate('/login')}
          >
            Ir al login
          </button>
        )}
      </div>
    </div>
  )
}
