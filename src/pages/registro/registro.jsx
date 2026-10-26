import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/apiClient.js'
import { obtenerMensajeError } from '../../lib/errores.js'
import './registro.css'

export default function Registro() {
  const navigate = useNavigate()

  const [clubes,  setClubes]  = useState([])
  const [form, setForm] = useState({
    nombre:          '',
    email:           '',
    telefono:        '',
    password:        '',
    confirmPassword: '',
    club_id:         '',
  })
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // Cargar clubes activos al montar
  useEffect(() => {
    api.get('/auth/clubes')
      .then(r => {
        const lista = r.data?.data ?? []
        setClubes(lista)
        // Si solo hay un club, preseleccionarlo
        if (lista.length === 1) {
          setForm(prev => ({ ...prev, club_id: lista[0].id }))
        }
      })
      .catch(() => {
        // Fallback: si la API falla, usar club_id = 1 silenciosamente
        setForm(prev => ({ ...prev, club_id: 1 }))
      })
  }, [])

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const { nombre, email, telefono, password, confirmPassword } = form

    if (!nombre.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Completá nombre, email y contraseña')
      return
    }
    if (!form.club_id) {
      setError('Seleccioná un club')
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
        telefono: telefono.trim() || null,
        password,
        club_id:  form.club_id,
      })

      setSuccess(data.mensaje || '¡Solicitud enviada! El admin del club te aprobará pronto.')
      setForm({ nombre: '', email: '', telefono: '', password: '', confirmPassword: '', club_id: form.club_id })
    } catch (err) {
      setError(obtenerMensajeError(err, 'Error al crear la cuenta'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="registro-container">
      <div className="registro-header">
        <button className="btn-volver-reg" onClick={() => navigate('/')}>
          ← Volver
        </button>
      </div>

      <div className="registro-hero">
        <h2>Crear cuenta</h2>
        <p>El admin aprobará tu solicitud</p>
      </div>

      <div className="registro-card">
        {!success ? (
          <form onSubmit={handleSubmit}>
            {error && <div className="reg-error-box">{error}</div>}

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

            <div className="form-group">
              <label htmlFor="telefono">Teléfono <span className="label-opcional">(opcional)</span></label>
              <input id="telefono" name="telefono" type="tel" className="form-input"
                placeholder="+54 9 11 0000-0000" value={form.telefono}
                onChange={handleChange} autoComplete="tel" />
            </div>

            {clubes.length > 1 && (
              <div className="form-group">
                <label htmlFor="club_id">Club</label>
                <select
                  id="club_id"
                  name="club_id"
                  className="form-input"
                  value={form.club_id}
                  onChange={handleChange}
                >
                  <option value="">Seleccioná tu club...</option>
                  {clubes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input id="password" name="password" type="password" className="form-input"
                placeholder="Mínimo 6 caracteres" value={form.password}
                onChange={handleChange} autoComplete="new-password" />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar contraseña</label>
              <input id="confirmPassword" name="confirmPassword" type="password" className="form-input"
                placeholder="••••••••" value={form.confirmPassword}
                onChange={handleChange} autoComplete="new-password" />
            </div>

            <p className="reg-info">
              Tu solicitud será revisada por el administrador. Te avisamos por email cuando se apruebe.
            </p>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Enviando...' : 'Solicitar ingreso'}
            </button>
          </form>
        ) : (
          <div className="reg-success">
            <div className="reg-success-icon">✓</div>
            <h3>¡Solicitud enviada!</h3>
            <p>{success}</p>
            <button className="btn-login" onClick={() => navigate('/login')}>
              Ir al inicio de sesión
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
