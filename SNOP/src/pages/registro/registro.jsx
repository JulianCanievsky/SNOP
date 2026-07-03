import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './registro.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export default function Registro() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const { nombre, email, password, confirmPassword } = form

    if (!nombre.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Completá todos los campos')
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
      const { data } = await axios.post(`${API_BASE}/auth/registro`, {
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        password,
      })

      setSuccess(data.mensaje)
      setForm({ nombre: '', email: '', password: '', confirmPassword: '' })
      setTimeout(() => navigate('/login'), 2500)

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
        <p>Tu nivel será asignado por el entrenador</p>
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
            El entrenador te asigna el nivel luego de tu clase de prueba
          </div>

          <button type="submit" className="btn-registro" disabled={loading}>
            {loading && <span className="spinner" />}
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  )
}
