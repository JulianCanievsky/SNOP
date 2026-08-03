import { useState } from 'react'
import './RatingEntrenador.css'

const COMENTARIOS_NEGATIVOS = [
  'Llegó tarde',
  'Poca atención',
  'Mala comunicación',
  'Clase corta',
  'Sin feedback',
]

const COMENTARIOS_POSITIVOS = [
  'Muy puntual',
  'Excelente técnica',
  'Gran comunicación',
  'Muy motivador',
  'Claro y paciente',
]

function formatearFecha(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

export default function RatingEntrenador({ turno, onEnviar, onOmitir, enviando }) {
  const [estrellas,      setEstrellas]      = useState(0)
  const [hover,          setHover]          = useState(0)
  const [seleccionados,  setSeleccionados]  = useState([])
  const [comentario,     setComentario]     = useState('')

  const sugerencias = estrellas >= 4 ? COMENTARIOS_POSITIVOS : COMENTARIOS_NEGATIVOS

  function toggleSugerencia(texto) {
    setSeleccionados(prev =>
      prev.includes(texto) ? prev.filter(s => s !== texto) : [...prev, texto]
    )
  }

  function handleEnviar() {
    if (!estrellas) return
    const textoFinal = [
      ...seleccionados,
      ...(comentario.trim() ? [comentario.trim()] : []),
    ].join('. ') || null

    onEnviar({ estrellas, comentario: textoFinal })
  }

  const iniciales = turno.entrenador
    ? turno.entrenador.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const estrellasActivas = hover || estrellas

  return (
    <div className="rating-overlay">
      <div className="rating-sheet">

        {/* Handle pill */}
        <div className="rating-handle" />

        {/* Pregunta */}
        <p className="rating-pregunta">¿Cómo estuvo tu clase?</p>

        {/* Avatar + nombre */}
        <div className="rating-entrenador">
          <div className="rating-avatar">
            {turno.foto_url
              ? <img src={turno.foto_url} alt={turno.entrenador} />
              : <span>{iniciales}</span>}
          </div>
          <p className="rating-nombre">{turno.entrenador}</p>
          {turno.fecha_inicio && (
            <p className="rating-fecha">{formatearFecha(turno.fecha_inicio)}</p>
          )}
        </div>

        {/* Estrellas */}
        <div className="rating-estrellas" role="group" aria-label="Calificación">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              className={`rating-estrella ${n <= estrellasActivas ? 'activa' : ''}`}
              onClick={() => setEstrellas(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
        </div>

        {/* Texto según puntaje */}
        {estrellasActivas > 0 && (
          <p className="rating-texto-estado">
            {estrellasActivas === 1 && 'Muy mala'}
            {estrellasActivas === 2 && 'Regular'}
            {estrellasActivas === 3 && 'Bien'}
            {estrellasActivas === 4 && 'Muy bien'}
            {estrellasActivas === 5 && 'Excelente'}
          </p>
        )}

        {/* Sugerencias rápidas — aparecen cuando eligieron estrellas */}
        {estrellas > 0 && (
          <div className="rating-sugerencias">
            <p className="rating-sugerencias-label">
              {estrellas >= 4 ? '¿Qué destacás?' : '¿Qué falló?'}
            </p>
            <div className="rating-chips">
              {sugerencias.map(s => (
                <button
                  key={s}
                  className={`rating-chip ${seleccionados.includes(s) ? 'chip-sel' : ''}`}
                  onClick={() => toggleSugerencia(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="rating-acciones">
          <button
            className="rating-btn-enviar"
            onClick={handleEnviar}
            disabled={!estrellas || enviando}
          >
            {enviando ? 'Enviando...' : 'Calificar entrenador'}
          </button>
          <button className="rating-btn-omitir" onClick={onOmitir} disabled={enviando}>
            Ahora no
          </button>
        </div>

      </div>
    </div>
  )
}
