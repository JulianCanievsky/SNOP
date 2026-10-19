import { useState } from 'react'
import { Clock, MapPin, User, Calendar, Gamepad2, Trophy, GraduationCap, Users } from 'lucide-react'
import './TurnoCard.css'
import { ToastContainer } from '../ui/Toast'
import { useToast } from '../../hooks/useToast'
import CategoriaBadge from '../ui/CategoriaBadge/CategoriaBadge'

const TZ = 'America/Argentina/Buenos_Aires'

// Configuración visual por tipo de evento
const TIPO_CONFIG = {
  turno_fijo: {
    label:      'Turno fijo',
    badgeClass: 'badge-tipo--fijo',
    Icono:      Calendar,
  },
  clase_particular: {
    label:      'Clase particular',
    badgeClass: 'badge-tipo--clase',
    Icono:      GraduationCap,
  },
  juego_libre: {
    label:      'Juego libre',
    badgeClass: 'badge-tipo--juego',
    Icono:      Gamepad2,
  },
  torneo: {
    label:      'Torneo',
    badgeClass: 'badge-tipo--torneo',
    Icono:      Trophy,
  },
}

export default function TurnoCard({ evento, onCancelar }) {
  const [mostrarModal, setMostrarModal] = useState(false)
  const [cancelando,   setCancelando]   = useState(false)
  const [cancelado,    setCancelado]    = useState(false)
  const { toasts, showToast, removeToast } = useToast()

  if (!evento?.fecha_inicio) return null

  const cfg = TIPO_CONFIG[evento.tipo] ?? TIPO_CONFIG.turno_fijo
  const { Icono } = cfg

  const fechaObj   = new Date(evento.fecha_inicio)
  const fechaTexto = fechaObj.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ,
  })
  const horaInicio = fechaObj.toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ,
  })
  const horaFin = new Date(evento.fecha_fin).toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ,
  })

  async function confirmarCancelacion() {
    setCancelando(true)
    try {
      await onCancelar()
      setCancelado(true)
      setMostrarModal(false)
    } catch {
      showToast('No se pudo cancelar. Intentá de nuevo.', 'error')
    } finally {
      setCancelando(false)
    }
  }

  if (cancelado) return null

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="turno-card">
        {/* HEADER: fecha + badge tipo */}
        <div className="turno-header">
          <h3>{fechaTexto}</h3>
          <span className={`badge-tipo ${cfg.badgeClass}`}>{cfg.label}</span>
        </div>

        {/* Categoría — solo para turnos fijos y clases */}
        {(evento.nivel_id !== undefined) && (
          <CategoriaBadge nivelId={evento.nivel_id} />
        )}

        {/* HORARIO */}
        <div className="horario">
          <div className="turno-card-icono">
            <Icono size={18} strokeWidth={1.8} />
          </div>
          <div className="horario-texto">
            <strong>{horaInicio} — {horaFin} hs</strong>
            {evento.duracion_min && <p>{evento.duracion_min} min</p>}
          </div>
          <span className={`badge-estado ${evento.estado === 'confirmado' ? 'estado--confirmado' : 'estado--inscripto'}`}>
            {evento.estado === 'confirmado' ? 'Confirmado' : 'Inscripto'}
          </span>
        </div>

        {/* INFO CONTEXTUAL según tipo */}
        <div className="info">
          {evento.sede && (
            <span className="info-item">
              <MapPin size={13} strokeWidth={1.8} />
              {evento.sede}
            </span>
          )}
          {evento.tipo === 'torneo' && evento.nombre && (
            <span className="info-item">
              <Trophy size={13} strokeWidth={1.8} />
              {evento.nombre}
            </span>
          )}
          {evento.tipo === 'torneo' && evento.modalidad && (
            <span className="info-item">
              <Users size={13} strokeWidth={1.8} />
              {evento.modalidad === 'dobles' ? 'Dobles' : 'Singles'}
            </span>
          )}
          {evento.tipo !== 'torneo' && evento.entrenador && (
            <span className="info-item">
              <User size={13} strokeWidth={1.8} />
              {evento.entrenador}
            </span>
          )}
          {evento.tipo !== 'torneo' && evento.mesa != null && (
            <span className="info-item">
              Mesa {evento.mesa}
            </span>
          )}
        </div>

        {/* ACCIÓN */}
        {typeof onCancelar === 'function' && (
          <button
            className="cancelar-btn"
            onClick={() => setMostrarModal(true)}
          >
            Cancelar {evento.tipo === 'juego_libre' ? 'inscripción' : evento.tipo === 'torneo' ? 'inscripción al torneo' : 'turno'}
          </button>
        )}
      </div>

      {/* MODAL CONFIRMAR */}
      {mostrarModal && (
        <div className="modal-overlay" onClick={() => setMostrarModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>¿Cancelar {evento.tipo === 'juego_libre' ? 'inscripción' : evento.tipo === 'torneo' ? 'inscripción al torneo' : 'turno'}?</h3>
            <p>
              Estás por cancelar{' '}
              <strong>{cfg.label.toLowerCase()}</strong> del{' '}
              <strong>{fechaTexto}</strong> a las <strong>{horaInicio} hs</strong>.
            </p>
            <p style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-muted)' }}>
              {evento.tipo !== 'juego_libre' && evento.tipo !== 'torneo' ? (
                <>
                  Si cancelás con <strong>24 hs o más de anticipación</strong>, la clase no se pierde y generás un crédito de recupero.{' '}
                  Si cancelás con menos de 24 hs, la clase se pierde sin crédito.
                </>
              ) : (
                'Esta acción no se puede deshacer.'
              )}
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
