import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotificaciones } from '../../hooks/useNotificaciones'
import BottomNav from '../../components/BottomNav/BottomNav'
import './Notificaciones.css'

const TIPO_ICONO = {
  turno_asignado:   '📅',
  solicitud_club:   '🏛️',
  clase_confirmada: '✅',
  clase_rechazada:  '❌',
  torneo:           '🏆',
}

const formatFecha = (iso) => {
  const d   = new Date(iso)
  const ahora = new Date()
  const diff  = ahora - d

  if (diff < 60 * 60 * 1000)  return 'Hace unos minutos'
  if (diff < 24 * 60 * 60 * 1000) {
    const h = Math.floor(diff / (60 * 60 * 1000))
    return `Hace ${h} hora${h !== 1 ? 's' : ''}`
  }
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

export default function Notificaciones() {
  const navigate = useNavigate()
  const { notificaciones, noLeidas, cargando, marcarTodas, marcarUna } = useNotificaciones()

  // Marcar todas como leídas al abrir la pantalla
  useEffect(() => {
    if (noLeidas > 0) {
      marcarTodas()
      // Avisar a Inicio para que baje el badge (reutilizando el mismo evento del sistema de comunicados)
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
        <button className="notif-volver" onClick={() => navigate(-1)}>←</button>
        <h1>Notificaciones</h1>
        {noLeidas > 0 && (
          <button className="notif-btn-leer-todas" onClick={marcarTodas}>
            Marcar todas
          </button>
        )}
      </header>

      <div className="notif-body">
        {cargando ? (
          <div className="notif-estado">
            <div className="notif-spinner" />
            <p>Cargando...</p>
          </div>
        ) : notificaciones.length === 0 ? (
          <div className="notif-estado">
            <p className="notif-vacio-ico">🔔</p>
            <p>No tenés notificaciones todavía.</p>
          </div>
        ) : (
          notificaciones.map(n => (
            <div
              key={n.id}
              className={`notif-item${!n.leida ? ' notif-item--nueva' : ''}`}
              onClick={() => handleClick(n)}
              role={n.link ? 'button' : undefined}
              tabIndex={n.link ? 0 : undefined}
              onKeyDown={e => e.key === 'Enter' && handleClick(n)}
            >
              <div className="notif-ico">
                {TIPO_ICONO[n.tipo] ?? '🔔'}
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
