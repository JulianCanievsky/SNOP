import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, XCircle, CheckCircle, AlertTriangle, Bell, Users, Megaphone, CircleDot, ChevronLeft } from 'lucide-react'
import { useNotificaciones } from '../../hooks/useNotificaciones'
import BottomNav from '../../components/BottomNav/BottomNav'
import './Notificaciones.css'

// Mapeo tipo → ícono Lucide
function TipoIcono({ tipo }) {
  const props = { size: 18, strokeWidth: 1.8 }
  switch (tipo) {
    case 'turno_asignado':         return <Calendar {...props} />
    case 'turno_baja':
    case 'clase_rechazada':
    case 'turno_cancelado_semana': return <XCircle {...props} />
    case 'clase_confirmada':       return <CheckCircle {...props} />
    case 'turno_suspendido':       return <AlertTriangle {...props} />
    case 'solicitud_club':
    case 'solicitud_clase':
    case 'nueva_solicitud':        return <Users {...props} />
    case 'lugar_disponible':       return <CircleDot {...props} style={{ color: 'var(--color-success)' }} />
    case 'comunicado':             return <Megaphone {...props} />
    default:                       return <Bell {...props} />
  }
}

const formatFecha = (iso) => {
  const d     = new Date(iso)
  const ahora = new Date()
  const diff  = ahora - d
  if (diff < 60 * 60 * 1000)       return 'Hace unos minutos'
  if (diff < 24 * 60 * 60 * 1000)  {
    const h = Math.floor(diff / (60 * 60 * 1000))
    return `Hace ${h} hora${h !== 1 ? 's' : ''}`
  }
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

export default function Notificaciones() {
  const navigate = useNavigate()
  const { notificaciones, noLeidas, cargando, marcarTodas, marcarUna } = useNotificaciones()

  useEffect(() => {
    if (noLeidas > 0) {
      marcarTodas()
      window.dispatchEvent(new Event('notificaciones-leidas'))
    }
  }, [noLeidas, marcarTodas])

  function handleClick(n) {
    if (!n.leida) marcarUna(n.id)
    if (n.link) navigate(n.link)
  }

  return (
    <div className="notif-page">
      <header className="notif-header">
        <button className="notif-volver" onClick={() => navigate(-1)} aria-label="Volver">
          <ChevronLeft size={22} />
        </button>
        <h1>Notificaciones</h1>
        {noLeidas > 0 && (
          <button className="notif-btn-leer-todas" onClick={marcarTodas}>
            Marcar todas
          </button>
        )}
      </header>

      <div className="notif-body">
        {cargando ? (
          <div className="snop-loading"><div className="snop-spinner" /></div>
        ) : notificaciones.length === 0 ? (
          <div className="snop-empty" style={{ paddingTop: 'var(--space-8)' }}>
            <Bell size={44} style={{ opacity: .3, marginBottom: 'var(--space-3)' }} />
            <p>No tenés notificaciones todavía.</p>
          </div>
        ) : (
          notificaciones.map(n => (
            <div
              key={n.id}
              className={`notif-item${!n.leida ? ' notif-item--nueva' : ''}${n.link ? ' notif-item--link' : ''}`}
              onClick={() => handleClick(n)}
              role={n.link ? 'button' : undefined}
              tabIndex={n.link ? 0 : undefined}
              onKeyDown={e => e.key === 'Enter' && handleClick(n)}
            >
              <div className="notif-ico">
                <TipoIcono tipo={n.tipo} />
              </div>
              <div className="notif-contenido">
                <div className="notif-titulo-row">
                  <p className="notif-titulo">{n.titulo}</p>
                  {!n.leida && <span className="notif-punto" aria-hidden="true" />}
                </div>
                <p className="notif-mensaje">{n.mensaje}</p>
                <p className="notif-fecha">{formatFecha(n.fecha)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  )
}
