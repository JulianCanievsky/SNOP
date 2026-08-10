import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav/AdminBottomNav'
import { getSolicitudes, aceptarSolicitud, rechazarSolicitud } from '../../services/adminApi'
import './Admin.css'

const ESTADO_STYLE = {
  pendiente: { background: '#fffbeb', color: '#d97706', label: 'Pendiente' },
  aceptada:  { background: '#f0fdf4', color: '#16a34a', label: 'Aceptada'  },
  rechazada: { background: '#fef2f2', color: '#ef4444', label: 'Rechazada' },
}

function formatFecha(iso) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function SolicitudesIngreso() {
  const navigate = useNavigate()
  const [solicitudes, setSolicitudes] = useState([])
  const [cargando,    setCargando]    = useState(true)
  const [filtro,      setFiltro]      = useState('pendiente')
  const [procesando,  setProcesando]  = useState(null)
  const [mensaje,     setMensaje]     = useState('')
  const [error,       setError]       = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const data = await getSolicitudes()
      setSolicitudes(data ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  function mostrar(msg, esError = false) {
    if (esError) setError(msg)
    else setMensaje(msg)
    setTimeout(() => { setMensaje(''); setError('') }, 3500)
  }

  async function handleAceptar(id) {
    setProcesando(id)
    try {
      await aceptarSolicitud(id)
      setSolicitudes(prev => prev.map(s =>
        s.id === id ? { ...s, estado: 'aceptada' } : s
      ))
      mostrar('Solicitud aceptada. El socio ya puede iniciar sesión.')
    } catch (err) {
      mostrar(err.response?.data?.error || 'Error al aceptar', true)
    } finally {
      setProcesando(null)
    }
  }

  async function handleRechazar(id) {
    setProcesando(id)
    try {
      await rechazarSolicitud(id)
      setSolicitudes(prev => prev.map(s =>
        s.id === id ? { ...s, estado: 'rechazada' } : s
      ))
      mostrar('Solicitud rechazada.')
    } catch (err) {
      mostrar(err.response?.data?.error || 'Error al rechazar', true)
    } finally {
      setProcesando(null)
    }
  }

  const filtradas = solicitudes.filter(s => s.estado === filtro)
  const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length

  return (
    <div className="admin-page">
      <div className="admin-header">
        <button className="btn-volver-admin" onClick={() => navigate('/admin')}>‹ Inicio</button>
        <h1>Solicitudes de ingreso</h1>
        <p>Aprobar o rechazar socios nuevos</p>
      </div>

      <div className="admin-body">
        {mensaje && <div className="alerta-exito">✓ {mensaje}</div>}
        {error   && <div className="alerta-error">{error}</div>}

        {/* Filtros */}
        <div className="filtros-row">
          {['pendiente', 'aceptada', 'rechazada'].map(est => {
            const esPendiente = est === 'pendiente' && pendientes > 0
            return (
              <button
                key={est}
                className={`filtro-pill${filtro === est ? ' activo' : ''}`}
                onClick={() => setFiltro(est)}
                style={{ position: 'relative' }}
              >
                {ESTADO_STYLE[est].label}
                {esPendiente && (
                  <span style={{
                    marginLeft: 6,
                    background: '#ef4444',
                    color: 'white',
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 6px',
                  }}>
                    {pendientes}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Lista */}
        <div className="admin-card">
          {cargando ? (
            <div className="estado-carga"><div className="spinner-admin" /></div>
          ) : filtradas.length === 0 ? (
            <div className="estado-vacio">
              No hay solicitudes {ESTADO_STYLE[filtro].label.toLowerCase()}s.
            </div>
          ) : (
            filtradas.map(s => {
              const est      = ESTADO_STYLE[s.estado] ?? ESTADO_STYLE.pendiente
              const ini      = s.users?.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
              const esProc   = procesando === s.id
              return (
                <div key={s.id} className="solicitud-row">
                  <div className="socio-avatar">{ini}</div>
                  <div className="socio-info" style={{ flex: 1 }}>
                    <p className="socio-nombre">{s.users?.nombre ?? '—'}</p>
                    <p className="socio-email">{s.users?.email ?? ''}</p>
                    {s.users?.telefono && (
                      <p className="socio-email">{s.users.telefono}</p>
                    )}
                    <p style={{ fontSize: 11, color: 'var(--admin-muted)', margin: '2px 0 0' }}>
                      {formatFecha(s.fecha_solicitud)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <span style={{
                      ...est,
                      fontSize: 11, fontWeight: 700, padding: '3px 10px',
                      borderRadius: 999, whiteSpace: 'nowrap',
                    }}>
                      {est.label}
                    </span>
                    {s.estado === 'pendiente' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: 12, width: 'auto' }}
                          onClick={() => handleAceptar(s.id)}
                          disabled={esProc}
                        >
                          {esProc ? '...' : 'Aceptar'}
                        </button>
                        <button
                          className="btn-danger"
                          style={{ padding: '6px 12px', fontSize: 12 }}
                          onClick={() => handleRechazar(s.id)}
                          disabled={esProc}
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <AdminBottomNav />
    </div>
  )
}
