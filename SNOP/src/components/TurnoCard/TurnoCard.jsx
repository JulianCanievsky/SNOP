import { useState } from 'react'
import './TurnoCard.css'

// Configuración visual por tipo de evento
const TIPO_CONFIG = {
  turno_fijo: {
    label:      'Turno fijo',
    badgeClass: 'badge-tipo--fijo',
    icono:      '📅',
  },
  clase_particular: {
    label:      'Clase particular',
    badgeClass: 'badge-tipo--clase',
    icono:      '👨‍🏫',
  },
  juego_libre: {
    label:      'Juego libre',
    badgeClass: 'badge-tipo--juego',
    icono:      '🏓',
  },
}

export default function TurnoCard({ evento, onCancelar }) {
  const [mostrarModal, setMostrarModal] = useState(false)
  const [cancelando,   setCancelando]   = useState(false)
  const [cancelado,    setCancelado]    = useState(false)

  if (!evento?.fecha_inicio) return null

  const cfg = TIPO_CONFIG[evento.tipo] ?? TIPO_CONFIG.turno_fijo

  const fechaObj    = new Date(evento.fecha_inicio)
  const fechaTexto  = fechaObj.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const horaInicio  = fechaObj.toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const horaFin     = new Date(evento.fecha_fin).toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })

  async function confirmarCancelacion() {
    setCancelando(true)
    try {
      await onCancelar()
      setCancelado(true)
      setMostrarModal(false)
    } catch {
      alert('No se pudo cancelar. Intentá de nuevo.')
    } finally {
      setCancelando(false)
    }
  }

  if (cancelado) return null

  return (
    <>
      <div className="turno-card">
        {/* HEADER: fecha + badge tipo */}
        <div className="turno-header">
          <h3>{fechaTexto}</h3>
          <span className={`badge-tipo ${cfg.badgeClass}`}>{cfg.label}</span>
        </div>

        {/* HORARIO */}
        <div className="horario">
          <div className="icono">{cfg.icono}</div>
          <div className="horario-texto">
            <strong>{horaInicio} — {horaFin} hs</strong>
            {evento.duracion_min && (
              <p>{evento.duracion_min} min</p>
            )}
          </div>
          <span className={`badge-estado ${evento.estado === 'confirmado' ? 'estado--confirmado' : 'estado--inscripto'}`}>
            {evento.estado === 'confirmado' ? 'Confirmado' : 'Inscripto'}
          </span>
        </div>

        {/* INFO CONTEXTUAL según tipo */}
        <div className="info">
          {evento.sede && <span>📍 {evento.sede}</span>}
          {evento.entrenador && <span>· 👤 {evento.entrenador}</span>}
          {evento.mesa != null && <span>· Mesa {evento.mesa}</span>}
        </div>

        {/* ACCIÓN */}
        <button
          className="cancelar-btn"
          onClick={() => setMostrarModal(true)}
        >
          Cancelar {evento.tipo === 'juego_libre' ? 'inscripción' : 'turno'}
        </button>
      </div>

      {/* MODAL CONFIRMAR */}
      {mostrarModal && (
        <div className="modal-overlay" onClick={() => setMostrarModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>¿Cancelar {evento.tipo === 'juego_libre' ? 'inscripción' : 'turno'}?</h3>
            <p>
              Estás por cancelar{' '}
              <strong>{cfg.label.toLowerCase()}</strong> del{' '}
              <strong>{fechaTexto}</strong> a las <strong>{horaInicio} hs</strong>.
              Esta acción no se puede deshacer.
            </p>
            <div className="modal-acciones">
              <button
                className="modal-btn-secundario"
                onClick={() => setMostrarModal(false)}
                disabled={cancelando}
              >
                Volver
              </button>
              <button
                className="modal-btn-peligro"
                onClick={confirmarCancelacion}
                disabled={cancelando}
              >
                {cancelando ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
