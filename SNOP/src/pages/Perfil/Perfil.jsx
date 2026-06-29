import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePerfil } from '../../hooks/usePerfil'
import BottomNav from '../../components/BottomNav/BottomNav'
import './Perfil.css'

const Perfil = () => {
  const { user, logout } = useAuth()
  const { perfil, cargando, cargarPerfil } = usePerfil()
  const [mostrarHistorial, setMostrarHistorial] = useState(false)

  // Mientras carga muestra skeleton con los datos básicos del AuthContext
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

  // Si falló la carga del backend, usa los datos del AuthContext como fallback
  const usuario = perfil?.usuario ?? user
  const turnos  = perfil?.turnos ?? []

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

  const ahora = new Date()

  const turnosActivos = turnos.filter(i => i.turnos && new Date(i.turnos.fecha_inicio) >= ahora)
  const turnosPasados = turnos.filter(i => i.turnos && new Date(i.turnos.fecha_inicio) < ahora)

  const handleLogout = async () => {
    await logout()
  }

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
        turnosActivos.map(inscripcion => {
          const turno = inscripcion.turnos
          const fecha = new Date(turno.fecha_inicio)
          return (
            <div key={turno.id} className="turno-card">
              <div>
                <strong>
                  {fecha.toLocaleDateString('es-AR', {
                    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
                  })}
                </strong>
                <p>{fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <span className="estado-activo">Próximo</span>
            </div>
          )
        })
      )}

      {mostrarHistorial && (
        <>
          <h4 className="perfil-seccion" style={{ marginTop: '20px' }}>Historial</h4>
          {turnosPasados.map(inscripcion => {
            const turno = inscripcion.turnos
            const fecha = new Date(turno.fecha_inicio)
            return (
              <div key={`h-${turno.id}`} className="turno-card">
                <div>
                  <strong>
                    {fecha.toLocaleDateString('es-AR', {
                      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
                    })}
                  </strong>
                  <p>{fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span className="deuda">Finalizado</span>
              </div>
            )
          })}
        </>
      )}

      <h4 className="perfil-seccion" style={{ marginTop: '20px' }}>Estado de cuenta</h4>
      <div className="cuota-card">
        <span>Cuota social</span>
        <span className={usuario.cuota_al_dia ? 'pagado' : 'deuda'}>
          {usuario.cuota_al_dia ? 'Pagado' : 'Pendiente'}
        </span>
      </div>

      <button className="btn-logout" onClick={handleLogout}>
        Cerrar sesión
      </button>

      <BottomNav />
    </div>
  )
}

export default Perfil
