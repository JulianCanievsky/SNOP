import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav/AdminBottomNav'
import { enviarComunicado, getComunicados, getStats } from '../../services/adminApi'
import './Admin.css'

export default function EnviarComunicado() {
  const navigate = useNavigate()

  const [titulo,       setTitulo]       = useState('')
  const [mensaje,      setMensaje]      = useState('')
  const [destinatario, setDestinatario] = useState('todos')
  const [recientes,    setRecientes]    = useState([])
  const [stats,        setStats]        = useState(null)
  const [enviando,     setEnviando]     = useState(false)
  const [exito,        setExito]        = useState(false)
  const [error,        setError]        = useState('')

  useEffect(() => {
    Promise.all([getComunicados(), getStats()])
      .then(([c, s]) => { setRecientes(c); setStats(s) })
      .catch(console.error)
  }, [])

  const opcionesDestinatarios = [
    { key: 'todos',          label: 'Todos los socios',    conteo: stats?.socios_activos },
    { key: 'entrenadores',   label: 'Entrenadores',        conteo: stats?.entrenadores },
    { key: 'con_deuda',      label: 'Socios con deuda',    conteo: stats?.con_deuda },
    { key: 'nivel_rojo',     label: 'Nivel Rojo',          conteo: null },
    { key: 'nivel_azul',     label: 'Nivel Azul',          conteo: null },
  ]

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!titulo.trim() || !mensaje.trim()) {
      setError('Completá título y mensaje')
      return
    }
    setEnviando(true)
    try {
      await enviarComunicado({ titulo, mensaje, destinatarios: destinatario })
      setExito(true)
      setTitulo('')
      setMensaje('')
      const nuevos = await getComunicados()
      setRecientes(nuevos)
      setTimeout(() => setExito(false), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar comunicado')
    } finally {
      setEnviando(false)
    }
  }

  function formatFecha(iso) {
    const d = new Date(iso)
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
  }

  const LABELS_DEST = {
    todos:        'Todos los socios',
    entrenadores: 'Entrenadores',
    con_deuda:    'Socios con deuda',
    nivel_rojo:   'Nivel Rojo',
    nivel_azul:   'Nivel Azul',
  }

  function formatDest(key) {
    return LABELS_DEST[key] ?? key
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <button className="btn-volver-admin" onClick={() => navigate('/admin')}>‹ Inicio</button>
        <h1>Enviar comunicado</h1>
        <p>Notificar a socios y entrenadores</p>
      </div>

      <div className="admin-body">
        {exito && <div className="alerta-exito">✓ Comunicado enviado correctamente</div>}
        {error && <div className="alerta-error">{error}</div>}

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Título</label>
            <input className="form-input" placeholder="Ej: Recordatorio cuota mayo"
              value={titulo} onChange={e => { setTitulo(e.target.value); setError('') }} />
          </div>

          <div className="form-group">
            <label>Mensaje</label>
            <textarea className="form-textarea" placeholder="Escribí el mensaje aquí..."
              value={mensaje} onChange={e => { setMensaje(e.target.value); setError('') }} />
          </div>

          <div className="form-group">
            <label>Destinatarios</label>
            <div className="radio-group">
              {opcionesDestinatarios.map(op => (
                <label
                  key={op.key}
                  className={`radio-option ${destinatario === op.key ? 'sel' : ''}`}
                  onClick={() => setDestinatario(op.key)}
                >
                  <input
                    type="radio"
                    name="destinatario"
                    value={op.key}
                    checked={destinatario === op.key}
                    onChange={() => setDestinatario(op.key)}
                  />
                  {op.label}
                  {op.conteo != null && (
                    <span style={{ marginLeft: 'auto', fontSize: 12, opacity: .7 }}>({op.conteo})</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={enviando}>
            {enviando ? 'Enviando...' : 'Enviar comunicado'}
          </button>
        </form>

        {/* Recientes */}
        {recientes.length > 0 && (
          <div>
            <p className="admin-label">Enviados recientemente</p>
            <div className="admin-card admin-card-body">
              {recientes.map(c => (
                <div key={c.id} className="comunicado-item">
                  <div className="comunicado-dot" />
                  <div>
                    <p className="comunicado-titulo">{c.titulo}</p>
                    <p className="comunicado-meta">{formatDest(c.destinatarios)} · {formatFecha(c.fecha)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AdminBottomNav />
    </div>
  )
}
