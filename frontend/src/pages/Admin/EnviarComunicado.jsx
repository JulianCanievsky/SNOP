import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppNav from '../../components/AppNav/AppNav'
import { enviarComunicado, getComunicados, getStats, getNiveles } from '../../services/adminApi'
import { obtenerMensajeError } from '../../lib/errores.js'
import './Admin.css'

// Normaliza destinatarios antiguos (string) a array
function normalizarDestinatarios(dest) {
  if (!dest) return []
  if (Array.isArray(dest)) return dest
  return [dest]
}

export default function EnviarComunicado() {
  const navigate = useNavigate()

  const [titulo,          setTitulo]          = useState('')
  const [mensaje,         setMensaje]         = useState('')
  const [seleccionados,   setSeleccionados]   = useState(['todos']) // array de keys
  const [recientes,       setRecientes]       = useState([])
  const [stats,           setStats]           = useState(null)
  const [niveles,         setNiveles]         = useState([])
  const [enviando,        setEnviando]        = useState(false)
  const [exito,           setExito]           = useState(false)
  const [error,           setError]           = useState('')

  useEffect(() => {
    Promise.all([getComunicados(), getStats(), getNiveles()])
      .then(([c, s, n]) => { setRecientes(c ?? []); setStats(s); setNiveles(n ?? []) })
      .catch(console.error)
  }, [])

  // Opciones disponibles
  const opcionesFijas = [
    { key: 'todos',        label: 'Todos los socios',  conteo: stats?.socios_activos },
    { key: 'entrenadores', label: 'Entrenadores',       conteo: stats?.entrenadores  },
    { key: 'con_deuda',    label: 'Socios con deuda',   conteo: stats?.con_deuda     },
  ]
  const opcionesNivel = niveles.map(n => ({
    key:   `nivel_${n.id}`,
    label: n.nombre,
    conteo: null,
  }))
  const todasLasOpciones = [...opcionesFijas, ...opcionesNivel]

  // Label para mostrar en recientes (puede venir como string o array)
  function labelDestinatarios(dest) {
    const arr = normalizarDestinatarios(dest)
    if (arr.length === 0) return 'Sin destinatarios'
    return arr.map(key => {
      const op = todasLasOpciones.find(o => o.key === key)
      return op ? op.label : key
    }).join(', ')
  }

  function toggleOpcion(key) {
    setSeleccionados(prev => {
      if (prev.includes(key)) {
        // No permitir deseleccionar todo
        if (prev.length === 1) return prev
        return prev.filter(k => k !== key)
      }
      return [...prev, key]
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!titulo.trim() || !mensaje.trim()) {
      setError('Completá título y mensaje')
      return
    }
    if (seleccionados.length === 0) {
      setError('Seleccioná al menos un destinatario')
      return
    }
    setEnviando(true)
    try {
      await enviarComunicado({ titulo, mensaje, destinatarios: seleccionados })
      setExito(true)
      setTitulo('')
      setMensaje('')
      setSeleccionados(['todos'])
      const nuevos = await getComunicados()
      setRecientes(nuevos ?? [])
      setTimeout(() => setExito(false), 4000)
    } catch (err) {
      setError(obtenerMensajeError(err, 'Error al enviar comunicado'))
    } finally {
      setEnviando(false)
    }
  }

  function formatFecha(iso) {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <button className="btn-volver-admin" onClick={() => navigate('/admin')}>‹ Inicio</button>
        <h1>Enviar comunicado</h1>
        <p>Notificar a socios y entrenadores</p>
      </div>

      <div className="admin-body">
        {exito && <div className="alerta-exito">✓ Comunicado enviado — los destinatarios reciben notificación y email</div>}
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
            <label>Destinatarios <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--color-text-muted)' }}>(podés elegir más de uno)</span></label>
            <div className="checkbox-group">
              {todasLasOpciones.map(op => (
                <label
                  key={op.key}
                  className={`checkbox-option${seleccionados.includes(op.key) ? ' sel' : ''}`}
                  onClick={() => toggleOpcion(op.key)}
                >
                  <input
                    type="checkbox"
                    checked={seleccionados.includes(op.key)}
                    onChange={() => toggleOpcion(op.key)}
                  />
                  {op.label}
                  {op.conteo != null && (
                    <span style={{ marginLeft: 'auto', fontSize: 12, opacity: .7 }}>({op.conteo})</span>
                  )}
                </label>
              ))}
            </div>
            {seleccionados.length > 1 && (
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>
                Se envía a {seleccionados.length} grupos (sin duplicar destinatarios).
              </p>
            )}
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
                    <p className="comunicado-meta">
                      {labelDestinatarios(c.destinatarios)} · {formatFecha(c.fecha)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AppNav />
    </div>
  )
}
