import { useState } from 'react'
import { useSolicitudesEntrenador } from '../../../hooks/useEntrenador'
import BottomNavEntrenador from '../../../components/BottomNavEntrenador/BottomNavEntrenador'
import './SolicitudesEntrenador.css'

function iniciales(nombre = '') {
  return nombre.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

function nivelBadgeClass(nombreNivel = '') {
  const n = nombreNivel.toLowerCase()
  if (n.includes('azul')) return 'nivel-azul'
  if (n.includes('rojo')) return 'nivel-rojo'
  if (n.includes('inter')) return 'nivel-intermedio'
  return 'nivel-default'
}

function formatFechaCorta(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatHora(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

export default function SolicitudesEntrenador() {
  const { solicitudes, cargando, responderSolicitud } = useSolicitudesEntrenador()
  const [procesando, setProcesando] = useState(null)

  const pendientes = solicitudes.filter((s) => s.estado === 'pendiente')
  const confirmadas = solicitudes.filter((s) => s.estado === 'confirmado')

  const handleResponder = async (solicitudId, accion) => {
    try {
      setProcesando(solicitudId)
      await responderSolicitud(solicitudId, accion)
    } catch (err) {
      console.error(err)
    } finally {
      setProcesando(null)
    }
  }

  const renderSolicitud = (sol, mostrarAcciones = false) => {
    const nivelNombre = sol.users?.niveles?.nombre || ''
    const alumnoNombre = sol.users?.nombre || 'Alumno'

    return (
      <div key={sol.id} className="solicitud-card">
        <div className="solicitud-card-header">
          <div className="sol-card-avatar">{iniciales(alumnoNombre)}</div>
          <div className="sol-card-info">
            <p className="sol-card-nombre">{alumnoNombre}</p>
            <p className="sol-card-detalle">
              {sol.turno
                ? `Clase particular · ${formatFechaCorta(sol.turno.fecha_inicio)} ${formatHora(sol.turno.fecha_inicio)}`
                : 'Clase particular'}
            </p>
          </div>
          {mostrarAcciones ? (
            <span className="badge-pendiente-sol">Pendiente</span>
          ) : sol.estado === 'confirmado' || sol.estado === true ? (
            <span className="badge-confirmada-sol">Confirmada</span>
          ) : (
            <span className="badge-rechazada-sol">Rechazada</span>
          )}
        </div>

        {nivelNombre && (
          <span className={`sol-nivel-badge ${nivelBadgeClass(nivelNombre)}`}>
            {nivelNombre}
          </span>
        )}

        {mostrarAcciones && (
          <div className="sol-card-acciones">
            <button
              className="btn-confirmar"
              disabled={procesando === sol.id}
              onClick={() => handleResponder(sol.id, 'confirmar')}
            >
              Confirmar
            </button>
            <button
              className="btn-rechazar"
              disabled={procesando === sol.id}
              onClick={() => handleResponder(sol.id, 'rechazar')}
            >
              Rechazar
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="solicitudes-e">
      <header className="solicitudes-e-header">
        <h1>Solicitudes</h1>
        <p className="subtitulo">Clases particulares recibidas</p>
      </header>

      <div className="solicitudes-e-contenido">

        {/* PENDIENTES */}
        <div>
          <p className="sol-seccion-titulo">Pendientes</p>
          {cargando ? (
            <div className="sin-solicitudes-e">Cargando...</div>
          ) : pendientes.length === 0 ? (
            <div className="sin-solicitudes-e">Sin solicitudes pendientes</div>
          ) : (
            pendientes.map((s) => renderSolicitud(s, true))
          )}
        </div>

        {/* CONFIRMADAS */}
        {confirmadas.length > 0 && (
          <div>
            <p className="sol-seccion-titulo">Confirmadas</p>
            {confirmadas.map((s) => renderSolicitud(s, false))}
          </div>
        )}

      </div>

      <BottomNavEntrenador />
    </div>
  )
}
