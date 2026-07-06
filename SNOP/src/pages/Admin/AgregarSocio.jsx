import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav/AdminBottomNav'
import { crearSocio, getEntrenadores, getSedes } from '../../services/adminApi'
import './Admin.css'

const NIVELES = [
  { key: '',            label: '— Sin asignar (clase de prueba) —' },
  { key: 'Rojo',        label: 'Rojo' },
  { key: 'Intermedio',  label: 'Intermedio' },
  { key: 'Azul',        label: 'Azul' },
]

export default function AgregarSocio() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    nivel: '',
    turno_fijo: '',
    entrenador_asignado_id: '',
  })

  const [entrenadores, setEntrenadores] = useState([])
  const [enviando,  setEnviando]  = useState(false)
  const [exito,     setExito]     = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    getEntrenadores().then(setEntrenadores).catch(console.error)
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
      await crearSocio(form)
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
        {exito && <div className="alerta-exito">✓ Socio creado. La contraseña por defecto es <strong>snop1234</strong>.</div>}
        {error && <div className="alerta-error">{error}</div>}

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre y apellido</label>
            <input name="nombre" className="form-input" placeholder="Nombre y apellido"
              value={form.nombre} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Correo electrónico</label>
            <input name="email" type="email" className="form-input" placeholder="email del socio"
              value={form.email} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Teléfono</label>
            <input name="telefono" className="form-input" placeholder="+54 11 ..."
              value={form.telefono} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Nivel inicial</label>
            <select name="nivel" className="form-select" value={form.nivel} onChange={handleChange}>
              {NIVELES.map(n => (
                <option key={n.key} value={n.key}>{n.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Turno fijo</label>
            <input name="turno_fijo" className="form-input" placeholder="Ej: Lunes 19:00 — Sede Palermo"
              value={form.turno_fijo} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Entrenador asignado</label>
            <select name="entrenador_asignado_id" className="form-select"
              value={form.entrenador_asignado_id} onChange={handleChange}>
              <option value="">— Sin entrenador —</option>
              {entrenadores.map(e => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
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
