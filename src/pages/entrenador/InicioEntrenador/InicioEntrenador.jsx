import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { useInicioEntrenador, useComunicadosEntrenador } from '../../../hooks/useEntrenador'
import api from '../../../lib/apiClient.js'
import BottomNavEntrenador from '../../../components/BottomNavEntrenador/BottomNavEntrenador'
import { ClipboardList, Clock, Users, Inbox, Bell } from 'lucide-react'
import './InicioEntrenador.css'

function iniciales(nombre = '') {
  return nombre
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const TZ = 'America/Argentina/Buenos_Aires'

function formatFechaCorta(fechaISO) {
  if (!fechaISO) return ''
  const d = new Date(fechaISO)
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ })
}

function formatHora(fechaISO) {
  if (!fechaISO) return ''
  return new Date(fechaISO).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TZ,
  })
}

export default function InicioEntrenador() {
  const { user } = useAuth()
  const { resumen, solicitudesPendientes, cargando, recargar } = useInicioEntrenador()
  const { comunicados } = useComunicadosEntrenador()
  const navigate = useNavigate()

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
  const nombre = user?.nombre?.split(' ')[0] || 'Entrenador'

  const accesos = [
    { label: 'Mis clases',             Icon: ClipboardList, path: '/entrenador/mis-clases' },
    { label: 'Mis horarios',           Icon: Clock,         path: '/entrenador/mis-horarios' },
    { label: 'Mis alumnos',            Icon: Users,         path: '/entrenador/mis-alumnos' },
    { label: 'Solicitudes pendientes', Icon: Inbox,         path: '/entrenador/solicitudes' },
  ]

  const handleResponder = async (solicitudId, accion) => {
    try {
      await api.patch(`/entrenador/solicitudes/${solicitudId}/${accion}`, {})
      recargar()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="inicio-e">
      {/* HEADER */}
      <header className="inicio-e-header">
        <div className="inicio-e-header-top">
          <div>
            <p className="saludo-sub">{saludo},</p>
            <h1 className="saludo-nombre">{nombre}</h1>
          </div>
          <button className="btn-campana" aria-label="Notificaciones" onClick={() => navigate('/entrenador/notificaciones')}>
            <Bell size={22} strokeWidth={1.8} />
          </button>
        </div>

        <div className="contadores">
          <div className="contador-card">
            <span className="contador-num">
              {cargando ? '—' : resumen?.clases_hoy ?? 0}
            </span>
            <span className="contador-label">Clases hoy</span>
          </div>
          <div className="contador-card">
            <span className="contador-num naranja">
              {cargando ? '—' : resumen?.turnos_pendientes ?? 0}
            </span>
            <span className="contador-label">Clases a confirmar</span>
          </div>
        </div>
      </header>

      {/* SOLICITUDES PENDIENTES */}
      <section className="seccion-e">
        <p className="seccion-e-titulo">Solicitudes pendientes</p>
        <div className="solicitudes-lista">
          {cargando ? (
            <div className="sin-solicitudes">Cargando...</div>
          ) : solicitudesPendientes.length === 0 ? (
            <div className="sin-solicitudes">Sin solicitudes pendientes</div>
          ) : (
            solicitudesPendientes.map((sol) => (
              <div key={sol.id} className="solicitud-item">
                <div className="sol-avatar">
                  {iniciales(sol.users?.nombre)}
                </div>
                <div className="sol-info">
                  <p className="sol-nombre">{sol.users?.nombre}</p>
                  <p className="sol-detalle">
                    {sol.turno
                      ? `Clase · ${formatFechaCorta(sol.turno.fecha_inicio)} ${formatHora(sol.turno.fecha_inicio)}`
                      : 'Clase particular'}
                  </p>
                </div>
                <div className="sol-acciones">
                  <button
                    className="btn-ok"
                    onClick={() => handleResponder(sol.id, 'confirmar')}
                  >
                    Ok
                  </button>
                  <button
                    className="btn-no"
                    onClick={() => handleResponder(sol.id, 'rechazar')}
                  >
                    No
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ACCESOS RÁPIDOS */}
      <section className="seccion-e">
        <p className="seccion-e-titulo">Accesos rápidos</p>
        <div className="grid-accesos-e">
          {accesos.map((a) => (
            <button
              key={a.path}
              className="acceso-card-e"
              onClick={() => navigate(a.path)}
            >
              <span className="acceso-icon-e"><a.Icon size={22} strokeWidth={1.8} /></span>
              <span className="acceso-label-e">{a.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* COMUNICADOS */}
      {comunicados.length > 0 && (
        <section className="seccion-e">
          <p className="seccion-e-titulo">Comunicados</p>
          <div className="comunicados-lista-e">
            {comunicados.slice(0, 3).map((c) => (
              <div key={c.id} className="comunicado-item-e">
                <p className="comunicado-titulo-e">{c.titulo}</p>
                <p className="comunicado-mensaje-e">{c.mensaje}</p>
                <span className="comunicado-fecha-e">
                  {new Date(c.fecha).toLocaleDateString('es-AR', {
                    day: 'numeric', month: 'long', timeZone: TZ,
                  })}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <BottomNavEntrenador />
    </div>
  )
}
