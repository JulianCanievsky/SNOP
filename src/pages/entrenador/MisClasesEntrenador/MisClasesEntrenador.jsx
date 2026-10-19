import { useState } from 'react'
import { useMisClasesEntrenador } from '../../../hooks/useEntrenador'
import BottomNavEntrenador from '../../../components/BottomNavEntrenador/BottomNavEntrenador'
import CategoriaBadge from '../../../components/ui/CategoriaBadge/CategoriaBadge'
import { Clock, MapPin } from 'lucide-react'
import api from '../../../lib/apiClient.js'
import './MisClasesEntrenador.css'

const DIAS_LETRA = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const TIPO_LABEL = { 1: 'Grupal', 2: 'Particular' }

const TZ = 'America/Argentina/Buenos_Aires'

function formatHora(iso) {
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ,
  })
}

function buildDias() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return {
      fecha: d,
      letra: DIAS_LETRA[d.getDay()],
      numero: d.getDate(),
      // Construimos la fecha ISO en ART para comparar correctamente con fecha_inicio
      iso: d.toLocaleDateString('en-CA', { timeZone: TZ }), // 'en-CA' produce YYYY-MM-DD
    }
  })
}

export default function MisClasesEntrenador() {
  const { clases, cargando, cancelarClase, recargar } = useMisClasesEntrenador()
  const [diaIdx, setDiaIdx] = useState(0)
  const [cancelando, setCancelando] = useState(null)
  const [accionSocio, setAccionSocio] = useState(null) // id de solicitud en proceso
  const [expandido, setExpandido] = useState(null)    // id de clase con lista abierta

  const dias = buildDias()
  const fechaSel = dias[diaIdx].iso

  const clasesFiltradas = clases.filter(
    // Comparamos la fecha del turno en ART contra la fecha seleccionada,
    // también en ART — evita desfasaje cuando fecha_inicio es UTC medianoche.
    (c) => c.fecha_inicio
      ? new Date(c.fecha_inicio).toLocaleDateString('en-CA', { timeZone: TZ }) === fechaSel
      : false
  )

  const handleCancelar = async (turnoId) => {
    if (!window.confirm('¿Cancelar esta clase?')) return
    try {
      setCancelando(turnoId)
      await cancelarClase(turnoId)
    } finally {
      setCancelando(null)
    }
  }

  const handleConfirmar = async (solicitudId, claseId) => {
    setAccionSocio(solicitudId)
    try {
      await api.patch(`/entrenador/solicitudes/${solicitudId}/confirmar`)
      recargar?.()
    } catch (err) {
      console.error(err)
    } finally {
      setAccionSocio(null)
    }
  }

  const handleRechazar = async (solicitudId) => {
    setAccionSocio(solicitudId)
    try {
      await api.patch(`/entrenador/solicitudes/${solicitudId}/rechazar`)
      recargar?.()
    } catch (err) {
      console.error(err)
    } finally {
      setAccionSocio(null)
    }
  }

  const badgeEstado = (estado) => {
    // estado en turnos es bool: true=activo, false=cancelado
    if (estado === true) return <span className="badge-estado badge-confirmado">Confirmado</span>
    if (estado === false) return <span className="badge-estado badge-cancelado">Cancelado</span>
    return <span className="badge-estado badge-pendiente">Pendiente</span>
  }

  return (
    <div className="mis-clases-e">
      <header className="mis-clases-e-header">
        <h1>Mis clases</h1>
        <p className="subtitulo">
          {dias[diaIdx].fecha.toLocaleDateString('es-AR', { weekday: 'long', timeZone: TZ }).charAt(0).toUpperCase() +
            dias[diaIdx].fecha.toLocaleDateString('es-AR', { weekday: 'long', timeZone: TZ }).slice(1)}
        </p>

        <div className="dias-scroll">
          {dias.map((dia, i) => (
            <button
              key={dia.iso}
              className={`dia-btn ${i === diaIdx ? 'activo' : ''}`}
              onClick={() => setDiaIdx(i)}
            >
              <span>{dia.letra}</span>
              <strong>{dia.numero}</strong>
            </button>
          ))}
        </div>
      </header>

      <main className="mis-clases-e-contenido">
        {cargando ? (
          <div className="sin-clases">Cargando...</div>
        ) : clasesFiltradas.length === 0 ? (
          <div className="sin-clases">No tenés clases para este día.</div>
        ) : (
          clasesFiltradas.map((clase) => {
            const nivelNombre = clase.niveles_min?.nombre || ''
            const inscritos = (clase.socio_turno || []).filter(
              (st) => st.estado === true
            ).length
            const pendientes = (clase.socio_turno || []).filter(
              (st) => st.estado === false
            ).length

            return (
              <div key={clase.id} className="clase-card">
                {/* Encabezado tipo + estado */}
                <div className="clase-card-header">
                  <span className="clase-tipo">
                    {TIPO_LABEL[clase.tipo_turno_id] || clase.tipo_turno?.nombre || 'Clase'}
                  </span>
                  {badgeEstado(clase.estado)}
                </div>

                {/* Horario + nivel */}
                <div className="clase-fila">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span className="clase-horario">
                    {formatHora(clase.fecha_inicio)} — {formatHora(clase.fecha_fin)} hs
                  </span>
                  {nivelNombre && (
                    <CategoriaBadge nombre={nivelNombre} abreviado />
                  )}
                </div>

                {/* Subtítulo duración */}
                <p className="clase-sub">
                  {clase.tipo_turno?.nombre || (clase.tipo_turno_id === 1 ? 'Entrenamiento' : 'Entrenamiento')} · {clase.duracion_min} min
                </p>

                {/* Alumnos + sede + mesa */}
                <p className="clase-detalle">
                  {inscritos} {inscritos === 1 ? 'jugador' : 'jugadores'} · Sede {clase.sedes?.nombre}
                  {clase.mesas?.numero ? ` · Mesa ${clase.mesas.numero}` : ''}
                </p>

                {/* Lista de inscriptos expandible */}
                <button
                  className="clase-btn-ver-lista"
                  onClick={() => setExpandido(expandido === clase.id ? null : clase.id)}
                >
                  {expandido === clase.id ? 'Ocultar lista' : `Ver inscriptos (${inscritos})`}
                  {pendientes > 0 && <span className="clase-badge-pendientes">{pendientes} pendiente{pendientes > 1 ? 's' : ''}</span>}
                </button>

                {expandido === clase.id && (
                  <div className="clase-inscriptos-lista">
                    {/* Pendientes de aprobación */}
                    {(clase.socio_turno ?? [])
                      .filter(s => s.estado === false)
                      .map(s => (
                        <div key={s.id} className="clase-inscripto-row clase-inscripto-row--pendiente">
                          <div className="clase-inscripto-info">
                            <span className="clase-inscripto-nombre">{s.users?.nombre ?? '—'}</span>
                            <span className="clase-inscripto-badge clase-inscripto-badge--pendiente">Pendiente</span>
                          </div>
                          <div className="clase-inscripto-acciones">
                            <button
                              disabled={accionSocio === s.id}
                              onClick={() => handleConfirmar(s.id, clase.id)}
                              className="clase-btn-confirmar"
                            >✓</button>
                            <button
                              disabled={accionSocio === s.id}
                              onClick={() => handleRechazar(s.id)}
                              className="clase-btn-rechazar"
                            >✕</button>
                          </div>
                        </div>
                      ))
                    }
                    {/* Confirmados */}
                    {(clase.socio_turno ?? [])
                      .filter(s => s.estado === true)
                      .map(s => (
                        <div key={s.id} className="clase-inscripto-row">
                          <div className="clase-inscripto-info">
                            <span className="clase-inscripto-nombre">{s.users?.nombre ?? '—'}</span>
                          </div>
                        </div>
                      ))
                    }
                    {inscritos === 0 && pendientes === 0 && (
                      <p className="clase-inscripto-vacio">Sin inscriptos todavía.</p>
                    )}
                  </div>
                )}

                {/* Cancelar turno */}
                {clase.estado !== false && (
                  <button
                    className="btn-cancelar-clase"
                    disabled={cancelando === clase.id}
                    onClick={() => handleCancelar(clase.id)}
                  >
                    {cancelando === clase.id ? 'Cancelando...' : 'Cancelar turno'}
                  </button>
                )}
              </div>
            )
          })
        )}
      </main>

      <BottomNavEntrenador />
    </div>
  )
}
