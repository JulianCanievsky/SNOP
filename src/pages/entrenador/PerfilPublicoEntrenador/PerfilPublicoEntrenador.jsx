/**
 * PerfilPublicoEntrenador.jsx
 * Vista pública del perfil de un entrenador, accesible para socios
 * desde la pantalla de Clases Particulares.
 *
 * Ruta: /entrenadores/:entrenadorId  (rol 1)
 */
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../../lib/apiClient.js'
import BottomNav from '../../../components/BottomNav/BottomNav'
import './PerfilPublicoEntrenador.css'

const TZ = 'America/Argentina/Buenos_Aires'

function iniciales(nombre = '') {
  return nombre
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatearDiaHora(fechaISO) {
  const fecha = new Date(fechaISO)
  const dia  = fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ })
  const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  return { dia, hora }
}

function BarraRating({ label, valor, total }) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0
  return (
    <div className="ppe-rating-dist-fila">
      <span className="ppe-rating-dist-label">{label}★</span>
      <div className="ppe-rating-dist-barra-bg">
        <div className="ppe-rating-dist-barra-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="ppe-rating-dist-count">{valor}</span>
    </div>
  )
}

export default function PerfilPublicoEntrenador() {
  const { entrenadorId } = useParams()
  const navigate         = useNavigate()

  const [entrenador,    setEntrenador]    = useState(null)
  const [ratingDetalle, setRatingDetalle] = useState(null)
  const [cargando,      setCargando]      = useState(true)
  const [error,         setError]         = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const [entRes, ratingRes] = await Promise.all([
        api.get(`/clases-particulares/entrenadores/${entrenadorId}`),
        api.get(`/ratings/entrenador/${entrenadorId}`).catch(() => ({ data: { data: null } })),
      ])
      setEntrenador(entRes.data.data)
      setRatingDetalle(ratingRes.data.data)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cargar el perfil del entrenador')
    } finally {
      setCargando(false)
    }
  }, [entrenadorId])

  useEffect(() => { cargar() }, [cargar])

  const promedio   = ratingDetalle?.promedio ?? entrenador?.rating ?? null
  const totalVotos = ratingDetalle?.total    ?? entrenador?.total_ratings ?? 0
  const dist       = ratingDetalle?.distribucion ?? {}

  if (cargando) {
    return (
      <div className="ppe-page">
        <header className="ppe-header">
          <button className="ppe-volver" onClick={() => navigate(-1)} aria-label="Volver">←</button>
          <h1>Perfil del entrenador</h1>
        </header>
        <div className="ppe-cargando">
          <div className="ppe-spinner" />
          <p>Cargando perfil...</p>
        </div>
        <BottomNav />
      </div>
    )
  }

  if (error || !entrenador) {
    return (
      <div className="ppe-page">
        <header className="ppe-header">
          <button className="ppe-volver" onClick={() => navigate(-1)} aria-label="Volver">←</button>
          <h1>Perfil del entrenador</h1>
        </header>
        <div className="ppe-error">
          <p>{error || 'Entrenador no encontrado'}</p>
          <button className="ppe-btn-secondary" onClick={cargar}>Reintentar</button>
        </div>
        <BottomNav />
      </div>
    )
  }

  const inics = iniciales(entrenador.nombre)

  return (
    <div className="ppe-page">
      {/* Header */}
      <header className="ppe-header">
        <button className="ppe-volver" onClick={() => navigate(-1)} aria-label="Volver">←</button>
        <h1>Perfil del entrenador</h1>
      </header>

      <div className="ppe-contenido">

        {/* Avatar + nombre */}
        <div className="ppe-card ppe-card-avatar">
          <div className="ppe-avatar">
            {entrenador.foto_url
              ? <img src={entrenador.foto_url} alt={entrenador.nombre} />
              : <span>{inics}</span>}
          </div>
          <h2 className="ppe-nombre">{entrenador.nombre}</h2>
          <p className="ppe-rol">{entrenador.tipo_usuario || 'Entrenador'}</p>
          {entrenador.clases_dadas != null && (
            <p className="ppe-clases-dadas">{entrenador.clases_dadas} clases dadas</p>
          )}
        </div>

        {/* Rating */}
        <div className="ppe-card">
          <p className="ppe-seccion-titulo">Calificación</p>
          <div className="ppe-rating-resumen">
            <div className="ppe-rating-numero">
              <span className="ppe-rating-valor">
                {promedio != null ? Number(promedio).toFixed(1) : '—'}
              </span>
              <div className="ppe-estrellas-vis">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`ppe-estrella ${promedio != null && n <= Math.round(promedio) ? 'llena' : ''}`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="ppe-rating-total">
                {totalVotos} {totalVotos === 1 ? 'calificación' : 'calificaciones'}
              </span>
            </div>

            {totalVotos > 0 && (
              <div className="ppe-rating-dist">
                {[5, 4, 3, 2, 1].map((n) => (
                  <BarraRating key={n} label={n} valor={dist[n] ?? 0} total={totalVotos} />
                ))}
              </div>
            )}
          </div>

          {/* Últimas reseñas */}
          {ratingDetalle?.recientes?.length > 0 && (
            <div className="ppe-resenas">
              <p className="ppe-resenas-titulo">Últimas reseñas</p>
              {ratingDetalle.recientes.map((r, i) => (
                <div key={i} className="ppe-resena">
                  <div className="ppe-resena-header">
                    <span className="ppe-resena-estrellas">
                      {'★'.repeat(r.estrellas)}{'☆'.repeat(5 - r.estrellas)}
                    </span>
                    <span className="ppe-resena-socio">{r.socio}</span>
                  </div>
                  {r.comentario && <p className="ppe-resena-comentario">{r.comentario}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Horarios disponibles */}
        {entrenador.turnos_disponibles?.length > 0 && (
          <div className="ppe-card">
            <p className="ppe-seccion-titulo">Horarios disponibles</p>
            <div className="ppe-turnos-lista">
              {entrenador.turnos_disponibles.map((turno) => {
                const { dia, hora } = formatearDiaHora(turno.fecha_inicio)
                return (
                  <div key={turno.id} className="ppe-turno-item">
                    <div className="ppe-turno-info">
                      <span className="ppe-turno-dia">{dia}</span>
                      <span className="ppe-turno-hora">{hora} hs{turno.duracion_min ? ` · ${turno.duracion_min} min` : ''}</span>
                      {turno.sede && <span className="ppe-turno-sede">📍 {turno.sede}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* CTA — volver a reservar */}
        <button
          className="ppe-btn-reservar"
          onClick={() => navigate('/clases-particulares')}
        >
          Reservar una clase
        </button>

      </div>

      <BottomNav />
    </div>
  )
}
