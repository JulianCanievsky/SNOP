/**
 * Entrenamientos.jsx — El socio ve los turnos de entrenamiento disponibles
 * de su categoría y puede solicitar unirse.
 *
 * Flujo:
 *  - disponible + hay cupo → botón "Solicitar"
 *  - disponible + sin cupo → botón "Lista de espera"
 *  - pendiente             → badge "Pendiente de aprobación"
 *  - confirmado            → badge "Confirmado"
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, MapPin, User, Clock, Users } from 'lucide-react'
import api from '../../lib/apiClient.js'
import { obtenerMensajeError } from '../../lib/errores.js'
import BottomNav from '../../components/BottomNav/BottomNav'
import CategoriaBadge from '../../components/ui/CategoriaBadge/CategoriaBadge'
import { ToastContainer } from '../../components/ui/Toast'
import { useToast } from '../../hooks/useToast'
import './Entrenamientos.css'

const TZ = 'America/Argentina/Buenos_Aires'

function formatFechaHora(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const fecha = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ })
  const hora  = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  return { fecha: fecha.charAt(0).toUpperCase() + fecha.slice(1), hora }
}

function formatHora(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
}

// Modal de confirmación de solicitud
function ModalSolicitar({ turno, onConfirmar, onCancelar, procesando }) {
  if (!turno) return null
  const { fecha, hora } = formatFechaHora(turno.fecha_inicio)
  const horaFin = formatHora(turno.fecha_fin)

  return (
    <div className="ent-modal-overlay" onClick={onCancelar}>
      <div className="ent-modal" onClick={e => e.stopPropagation()}>
        <h3>Solicitar turno</h3>
        <p className="ent-modal-fecha">{fecha}</p>
        <p className="ent-modal-hora">
          <Clock size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          {hora} — {horaFin} hs · {turno.duracion_min} min
        </p>
        {turno.sede && (
          <p className="ent-modal-info">
            <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {turno.sede}
            {turno.entrenador ? ` · ${turno.entrenador}` : ''}
          </p>
        )}
        <div className="ent-modal-aviso">
          El entrenador revisará tu solicitud y te confirmará por notificación.
        </div>
        <div className="ent-modal-acciones">
          <button className="ent-btn-secundario" onClick={onCancelar} disabled={procesando}>
            Cancelar
          </button>
          <button className="ent-btn-primario" onClick={onConfirmar} disabled={procesando}>
            {procesando ? 'Enviando...' : 'Confirmar solicitud'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Entrenamientos() {
  const navigate = useNavigate()
  const { toasts, showToast, removeToast } = useToast()

  const [turnos,    setTurnos]    = useState([])
  const [cargando,  setCargando]  = useState(true)
  const [error,     setError]     = useState(null)
  const [turnoSel,  setTurnoSel]  = useState(null)  // turno para el modal
  const [procesando,setProcesando]= useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const { data } = await api.get('/turnos/disponibles')
      setTurnos(data.data ?? [])
    } catch (err) {
      setError(obtenerMensajeError(err, 'No se pudieron cargar los entrenamientos'))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function handleSolicitar() {
    if (!turnoSel || procesando) return
    setProcesando(true)
    try {
      await api.post('/turnos/solicitar', { turno_id: turnoSel.id })
      showToast('Solicitud enviada. El entrenador te confirmará pronto.', 'success')
      setTurnoSel(null)
      await cargar()
    } catch (err) {
      showToast(obtenerMensajeError(err, 'No se pudo enviar la solicitud'), 'error')
    } finally {
      setProcesando(false)
    }
  }

  async function handleListaEspera(turno) {
    try {
      await api.post(`/turnos/${turno.id}/lista-espera`)
      showToast('Te anotaste en la lista de espera. Te avisamos si se libera un lugar.', 'success')
      await cargar()
    } catch (err) {
      showToast(obtenerMensajeError(err, 'No se pudo agregar a la lista de espera'), 'error')
    }
  }

  const renderBoton = (turno) => {
    switch (turno.estado_socio) {
      case 'confirmado':
        return <span className="ent-badge ent-badge--ok">✓ Confirmado</span>
      case 'pendiente':
        return <span className="ent-badge ent-badge--pendiente">Pendiente</span>
      default:
        if (turno.cupo_disponible > 0) {
          return (
            <button className="ent-btn-solicitar" onClick={() => setTurnoSel(turno)}>
              Solicitar
            </button>
          )
        }
        return (
          <button className="ent-btn-espera" onClick={() => handleListaEspera(turno)}>
            Lista de espera
          </button>
        )
    }
  }

  return (
    <div className="ent-page">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <header className="ent-header">
        <button className="ent-btn-back" onClick={() => navigate(-1)} aria-label="Volver">
          ←
        </button>
        <div>
          <h1>Entrenamientos</h1>
          <p>Turnos disponibles para tu categoría</p>
        </div>
      </header>

      <div className="ent-body">
        {cargando ? (
          <div className="snop-loading"><div className="snop-spinner" /></div>
        ) : error ? (
          <div className="snop-empty">
            <p>{error}</p>
            <button className="btn-secondary" style={{ width: 'auto', marginTop: 'var(--space-3)' }} onClick={cargar}>
              Reintentar
            </button>
          </div>
        ) : turnos.length === 0 ? (
          <div className="snop-empty">
            <Calendar size={40} style={{ opacity: .4, marginBottom: 'var(--space-3)' }} />
            <p>No hay turnos disponibles para tu categoría.</p>
          </div>
        ) : (
          turnos.map(turno => {
            const { fecha, hora } = formatFechaHora(turno.fecha_inicio)
            const horaFin = formatHora(turno.fecha_fin)
            const pct = turno.capacidad_maxima > 0
              ? Math.min((turno.inscriptos / turno.capacidad_maxima) * 100, 100)
              : 0

            return (
              <div key={turno.id} className={`ent-card ${turno.cupo_disponible === 0 && turno.estado_socio === 'disponible' ? 'ent-card--lleno' : ''}`}>
                {/* Fecha */}
                <p className="ent-card-fecha">{fecha}</p>

                {/* Horario + categoría */}
                <div className="ent-card-row">
                  <div className="ent-card-horario">
                    <Clock size={14} />
                    <span>{hora} — {horaFin} hs · {turno.duracion_min} min</span>
                  </div>
                  <CategoriaBadge nivelId={turno.nivel_minimo_id} abreviado />
                </div>

                {/* Sede + entrenador */}
                <div className="ent-card-info">
                  {turno.sede && (
                    <span><MapPin size={13} /> {turno.sede}</span>
                  )}
                  {turno.entrenador && (
                    <span><User size={13} /> {turno.entrenador}</span>
                  )}
                </div>

                {/* Barra de cupo */}
                <div className="ent-cupo-wrap">
                  <div className="ent-cupo-bar">
                    <div
                      className="ent-cupo-fill"
                      style={{
                        width: `${pct}%`,
                        background: pct >= 100 ? 'var(--color-danger)' : 'var(--color-primary)',
                      }}
                    />
                  </div>
                  <span className="ent-cupo-txt">
                    <Users size={12} /> {turno.inscriptos}/{turno.capacidad_maxima}
                    {turno.cupo_disponible > 0 ? ` · ${turno.cupo_disponible} libre${turno.cupo_disponible !== 1 ? 's' : ''}` : ' · Lleno'}
                  </span>
                </div>

                {/* Acción */}
                <div className="ent-card-footer">
                  {renderBoton(turno)}
                </div>
              </div>
            )
          })
        )}
      </div>

      <ModalSolicitar
        turno={turnoSel}
        onConfirmar={handleSolicitar}
        onCancelar={() => setTurnoSel(null)}
        procesando={procesando}
      />

      <BottomNav />
    </div>
  )
}
