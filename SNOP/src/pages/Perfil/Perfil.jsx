import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePerfil } from '../../hooks/usePerfil'
import BottomNav from '../../components/BottomNav/BottomNav'
import './Perfil.css'

const Perfil = () => {
  const { perfil, cargando } = usePerfil()
  const [mostrarHistorial, setMostrarHistorial] = useState(false)
  const navigate = useNavigate()

  if (cargando) {
    return (
      <div className="perfil-container">
        <div className="estado-carga">Cargando...</div>
        <BottomNav />
      </div>
    )
  }

  if (!perfil) {
    return (
      <div className="perfil-container">
        <div className="estado-error">Error al cargar perfil</div>
        <BottomNav />
      </div>
    )
  }

  const usuario = perfil.usuario
  const iniciales = usuario.nombre
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const ahora = new Date()

  const turnosActivos = perfil.turnos.filter(inscripcion => {
    const turno = inscripcion.turnos
    return turno && new Date(turno.fecha_inicio) >= ahora
  })

  const turnosPasados = perfil.turnos.filter(inscripcion => {
    const turno = inscripcion.turnos
    return turno && new Date(turno.fecha_inicio) < ahora
  })

  const handleLogout = () => {
    localStorage.removeItem('snop_token')
    localStorage.removeItem('snop_user')
    navigate('/login')
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
        <button
          className="btn-historial"
          onClick={() => setMostrarHistorial(!mostrarHistorial)}
        >
          {mostrarHistorial ? 'Ocultar historial' : 'Ver historial'}
        </button>
      </div>

      {turnosActivos.length === 0 && (
        <div className="turno-card">No tenés turnos activos.</div>
      )}

      {turnosActivos.map(inscripcion => {
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
              <p>
                {fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <span className="estado-activo">Próximo</span>
          </div>
        )
      })}

      {mostrarHistorial && (
        <>
          <h4 className="perfil-seccion" style={{ marginTop: '25px' }}>
            Historial de turnos
          </h4>

          {turnosPasados.length === 0 && (
            <div className="turno-card">No hay historial.</div>
          )}

          {turnosPasados.map(inscripcion => {
            const turno = inscripcion.turnos
            const fecha = new Date(turno.fecha_inicio)
            return (
              <div key={`historial-${turno.id}`} className="turno-card">
                <div>
                  <strong>
                    {fecha.toLocaleDateString('es-AR', {
                      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
                    })}
                  </strong>
                  <p>
                    {fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className="deuda">Finalizado</span>
              </div>
            )
          })}
        </>
      )}

      <h4 className="perfil-seccion">Estado de cuenta</h4>

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
