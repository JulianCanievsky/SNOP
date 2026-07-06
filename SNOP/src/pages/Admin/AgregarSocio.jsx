import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav/AdminBottomNav'
import { crearSocio, getNiveles } from '../../services/adminApi'
import './Admin.css'

export default function AgregarSocio() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    nombre:   '',
    email:    '',
    telefono: '',
    nivel_id: '',
  })

  const [niveles,  setNiveles]  = useState([])
  const [enviando, setEnviando] = useState(false)
  const [exito,    setExito]    = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    getNiveles().then(setNiveles).catch(console.error)
  }, [])

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.nombre.trim() || !form.email.trim()) {
      setError('Nombre y email son requeridos')
      return
    }

    setEnviando(true)
    try {
      await crearSocio({
        nombre:   form.nombre.trim(),
        email:    form.email.trim().toLowerCase(),
        telefono: form.telefono.trim() || undefined,
        nivel_id: form.nivel_id ? Number(form.nivel_id) : undefined,
      })
      setExito(true)
      setTimeout(() => navigate('/admin/socios'), 1800)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear socio')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <button className="btn-volver-admin" onClick={() => navigate('/admin/socios')}>‹ Socios</button>
        <h1>Agregar socio</h1>
        <p>Nuevo miembro del club</p>
      </div>

      <div className="admin-body">
        {exito && (
          <div className="alerta-exito">
            ✓ Socio creado. La contraseña por defecto es <strong>snop1234</strong>.
          </div>
        )}
        {error && <div className="alerta-error">{error}</div>}

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre y apellido</label>
            <input
              name="nombre" className="form-input" placeholder="Nombre y apellido"
              value={form.nombre} onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Correo electrónico</label>
            <input
              name="email" type="email" className="form-input" placeholder="email del socio"
              value={form.email} onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Teléfono (opcional)</label>
            <input
              name="telefono" className="form-input" placeholder="+54 11 ..."
              value={form.telefono} onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Nivel inicial</label>
            <select name="nivel_id" className="form-select" value={form.nivel_id} onChange={handleChange}>
              <option value="">— Sin asignar (clase de prueba) —</option>
              {niveles.map(n => (
                <option key={n.id} value={n.id}>{n.nombre}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn-primary" disabled={enviando}>
            {enviando ? 'Creando...' : 'Crear socio'}
          </button>
        </form>
      </div>

      <AdminBottomNav />
    </div>
  )
}
