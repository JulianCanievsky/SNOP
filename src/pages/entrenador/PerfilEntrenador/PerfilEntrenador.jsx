import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { usePerfilEntrenador } from '../../../hooks/useEntrenador'
import api from '../../../lib/apiClient.js'
import BottomNavEntrenador from '../../../components/BottomNavEntrenador/BottomNavEntrenador'
import './PerfilEntrenador.css'

function iniciales(nombre = '') {
  return nombre.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

// Barra de distribución de estrellas
function BarraRating({ label, valor, total }) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0
  return (
    <div className="rating-dist-fila">
      <span className="rating-dist-label">{label}★</span>
      <div className="rating-dist-barra-bg">
        <div className="rating-dist-barra-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="rating-dist-count">{valor}</span>
    </div>
  )
}

export default function PerfilEntrenador() {
  const { user, logout } = useAuth()
  const { perfil, cargando } = usePerfilEntrenador()
  const [ratingDetalle, setRatingDetalle] = useState(null)

  const datos = perfil || user
  const inics = iniciales(datos?.nombre || '')

  // Cargar distribución de ratings
  useEffect(() => {
    if (!datos?.id) return
    api.get(`/ratings/entrenador/${datos.id}`)
      .then(r => setRatingDetalle(r.data.data))
      .catch(() => {}) // silencioso si falla
  }, [datos?.id])

  const handleLogout = async () => {
    await logout()
  }

  const promedio   = ratingDetalle?.promedio ?? perfil?.rating ?? null
  const totalVotos = ratingDetalle?.total    ?? 0
  const dist       = ratingDetalle?.distribucion ?? {}

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

        {/* Bloque de rating visual */}
        {(promedio !== null || !cargando) && (
          <div className="perfil-e-rating-card">
            <p className="info-seccion-titulo">Mi rating</p>

            <div className="rating-resumen">
              <div className="rating-numero-grande">
                <span className="rating-valor">{promedio != null ? promedio.toFixed(1) : '—'}</span>
                <div className="rating-estrellas-vis">
                  {[1,2,3,4,5].map(n => (
                    <span
                      key={n}
                      className={`re-estrella ${promedio != null && n <= Math.round(promedio) ? 'llena' : ''}`}
                    >★</span>
                  ))}
                </div>
                <span className="rating-total">{totalVotos} {totalVotos === 1 ? 'calificación' : 'calificaciones'}</span>
              </div>

              {totalVotos > 0 && (
                <div className="rating-dist">
                  {[5,4,3,2,1].map(n => (
                    <BarraRating key={n} label={n} valor={dist[n] ?? 0} total={totalVotos} />
                  ))}
                </div>
              )}
            </div>

            {/* Últimas reseñas */}
            {ratingDetalle?.recientes?.length > 0 && (
              <div className="rating-recientes">
                <p className="rating-recientes-titulo">Últimas reseñas</p>
                {ratingDetalle.recientes.map((r, i) => (
                  <div key={i} className="rating-resena">
                    <div className="resena-header">
                      <span className="resena-estrellas">{'★'.repeat(r.estrellas)}{'☆'.repeat(5 - r.estrellas)}</span>
                      <span className="resena-socio">{r.socio}</span>
                    </div>
                    {r.comentario && <p className="resena-comentario">{r.comentario}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Datos del entrenador */}
        <div className="perfil-e-info-card">
          <p className="info-seccion-titulo">Información</p>

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
