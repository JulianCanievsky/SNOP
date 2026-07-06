import { useAuth } from '../../../context/AuthContext'
import { usePerfilEntrenador } from '../../../hooks/useEntrenador'
import BottomNavEntrenador from '../../../components/BottomNavEntrenador/BottomNavEntrenador'
import './PerfilEntrenador.css'

function iniciales(nombre = '') {
  return nombre.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function PerfilEntrenador() {
  const { user, logout } = useAuth()
  const { perfil, cargando } = usePerfilEntrenador()

  // Mientras carga, usa los datos del contexto como fallback
  const datos = perfil || user
  const inics = iniciales(datos?.nombre || '')

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="perfil-e">
      <header className="perfil-e-header">
        <h1>Mi perfil</h1>
      </header>

      <div className="perfil-e-contenido">
        {/* Avatar + nombre */}
        <div className="perfil-e-card">
          <div className="perfil-e-avatar">{inics}</div>
          <h2>{datos?.nombre || '—'}</h2>
          <p className="email">{datos?.email || '—'}</p>
        </div>

        {/* Datos del entrenador */}
        <div className="perfil-e-info-card">
          <p className="info-seccion-titulo">Mis turnos fijos</p>

          <div className="info-fila">
            <span className="info-clave">Club</span>
            <span className="info-valor">
              {cargando ? '...' : perfil?.club || '—'}
            </span>
          </div>

          <div className="info-fila">
            <span className="info-clave">Alumnos activos</span>
            <span className="info-valor">
              {cargando ? '...' : perfil?.alumnos_activos ?? '—'}
            </span>
          </div>

          <div className="info-fila">
            <span className="info-clave">En el club desde</span>
            <span className="info-valor">
              {cargando ? '...' : perfil?.en_el_club_desde ?? '—'}
            </span>
          </div>

          {perfil?.clases_dadas != null && (
            <div className="info-fila">
              <span className="info-clave">Clases dadas</span>
              <span className="info-valor">{perfil.clases_dadas}</span>
            </div>
          )}

          {perfil?.rating != null && (
            <div className="info-fila">
              <span className="info-clave">Rating</span>
              <span className="info-valor">⭐ {perfil.rating}</span>
            </div>
          )}
        </div>

        {/* Logout */}
        <button className="btn-logout-e" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>

      <BottomNavEntrenador />
    </div>
  )
}
