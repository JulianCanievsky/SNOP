import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePerfil } from '../../hooks/usePerfil'
import BottomNav from '../../components/BottomNav/BottomNav'
import './Perfil.css'

const formatHora = (iso) =>
  new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })

const formatFecha = (iso) =>
  new Date(iso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

function TurnoCardPerfil({ inscripcion, pasado }) {
  const turno = inscripcion.turnos
  if (!turno) return null

  const horaInicio = formatHora(turno.fecha_inicio)
  const horaFin    = turno.fecha_fin ? formatHora(turno.fecha_fin) : null
  const fechaTexto = formatFecha(turno.fecha_inicio)

  return (
    <div className={`turno-card-perfil${pasado ? ' turno-card-perfil-pasado' : ''}`}>
      <div className="turno-card-perfil-header">
        <h3 className="turno-card-perfil-fecha">{fechaTexto}</h3>
        <span className={pasado ? 'deuda' : 'estado-activo'}>
          {pasado ? 'Finalizado' : 'Próximo'}
        </span>
      </div>
      <div className="turno-card-perfil-horario">
        <span className="turno-card-perfil-icono">⏰</span>
        <div>
          <strong>{horaInicio}{horaFin ? ` — ${horaFin} hs` : ' hs'}</strong>
          {turno.duracion_min && <p>{turno.duracion_min} min</p>}
        </div>
      </div>
      {(turno.sedes?.nombre || turno.mesas?.numero || turno.users?.nombre) && (
        <div className="turno-card-perfil-info">
          {turno.users?.nombre && <span>👨‍🏫 {turno.users.nombre}</span>}
          {turno.sedes?.nombre && <span>📍 {turno.sedes.nombre}</span>}
          {turno.mesas?.numero && <span>🏓 Mesa {turno.mesas.numero}</span>}
        </div>
      )}
    </div>
  )
}

const Perfil = () => {
  const { user, logout } = useAuth()
  const { perfil, cargando, cargarPerfil } = usePerfil()
  const [mostrarHistorial, setMostrarHistorial] = useState(false)

  if (cargando) {
    return (
      <div className="perfil-container">
        <div className="perfil-header"><h2>Mi perfil</h2></div>
        {user && (
          <div className="perfil-card">
            <div className="perfil-avatar">
              {user.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
            </div>
            <h3>{user.nombre}</h3>
            <p>{user.email}</p>
          </div>
        )}
        <div className="estado-carga">Cargando información...</div>
        <BottomNav />
      </div>
    )
  }

  const usuario = perfil?.usuario ?? user
  const turnos  = perfil?.turnos  ?? []

  if (!usuario) {
    return (
      <div className="perfil-container">
        <div className="perfil-header"><h2>Mi perfil</h2></div>
        <div className="estado-error">
          No se pudo cargar el perfil.
          <button className="btn-reintentar" onClick={cargarPerfil}>Reintentar</button>
        </div>
        <BottomNav />
      </div>
    )
  }

  const iniciales = usuario.nombre
    ?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'

  const ahora        = new Date()
  const turnosActivos = turnos.filter(i => i.turnos && new Date(i.turnos.fecha_inicio) >= ahora)
  const turnosPasados = turnos.filter(i => i.turnos && new Date(i.turnos.fecha_inicio) <  ahora)

  return (
    <div className="perfil-container">
      <div className="perfil-header">
        <h2>Mi perfil</h2>
      </div>

      <div className="perfil-card">
        <div className="perfil-avatar">{iniciales}</div>
        <h3>{usuario.nombre}</h3>
        <p>{usuario.email}</p>
      </div>

      <div className="perfil-seccion-header">
        <h4 className="perfil-seccion">Próximos turnos</h4>
        {turnosPasados.length > 0 && (
          <button
            className="btn-historial"
            onClick={() => setMostrarHistorial(!mostrarHistorial)}
          >
            {mostrarHistorial ? 'Ocultar historial' : 'Ver historial'}
          </button>
        )}
      </div>

      {turnosActivos.length === 0 ? (
        <div className="turno-card sin-turnos-perfil">No tenés turnos activos.</div>
      ) : (
        turnosActivos.map(inscripcion => (
          <TurnoCardPerfil
            key={inscripcion.turno_id ?? inscripcion.turnos?.id}
            inscripcion={inscripcion}
            pasado={false}
          />
        ))
      )}

      {mostrarHistorial && (
        <>
          <h4 className="perfil-seccion" style={{ marginTop: '20px' }}>Historial</h4>
          {turnosPasados.map(inscripcion => (
            <TurnoCardPerfil
              key={`h-${inscripcion.turno_id ?? inscripcion.turnos?.id}`}
              inscripcion={inscripcion}
              pasado
            />
          ))}
        </>
      )}

      <h4 className="perfil-seccion" style={{ marginTop: '20px' }}>Estado de cuenta</h4>
      <div className="cuota-card">
        <span>Cuota social</span>
        <span className={usuario.cuota_al_dia ? 'pagado' : 'deuda'}>
          {usuario.cuota_al_dia ? 'Pagado' : 'Pendiente'}
        </span>
      </div>

      <button className="btn-logout" onClick={logout}>
        Cerrar sesión
      </button>

      <BottomNav />
    </div>
  )
}

export default Perfil
