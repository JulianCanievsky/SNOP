import { useState } from 'react'
import { useMisClasesEntrenador } from '../../../hooks/useEntrenador'
import BottomNavEntrenador from '../../../components/BottomNavEntrenador/BottomNavEntrenador'
import './MisClasesEntrenador.css'

const DIAS_LETRA = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const TIPO_LABEL = { 1: 'Grupal', 2: 'Particular' }

function nivelBadgeClass(nombreNivel = '') {
  const n = nombreNivel.toLowerCase()
  if (n.includes('azul')) return 'nivel-azul'
  if (n.includes('rojo')) return 'nivel-rojo'
  if (n.includes('inter')) return 'nivel-intermedio'
  return 'nivel-default'
}

function formatHora(iso) {
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit', hour12: false,
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
      iso: d.toISOString().slice(0, 10),
    }
  })
}

export default function MisClasesEntrenador() {
  const { clases, cargando, cancelarClase } = useMisClasesEntrenador()
  const [diaIdx, setDiaIdx] = useState(0)
  const [cancelando, setCancelando] = useState(null)

  const dias = buildDias()
  const fechaSel = dias[diaIdx].iso

  const clasesFiltradas = clases.filter(
    (c) => c.fecha_inicio?.slice(0, 10) === fechaSel
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
          {dias[diaIdx].fecha.toLocaleDateString('es-AR', { weekday: 'long' }).charAt(0).toUpperCase() +
            dias[diaIdx].fecha.toLocaleDateString('es-AR', { weekday: 'long' }).slice(1)}
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
                    <span className={`badge-nivel ${nivelBadgeClass(nivelNombre)}`}>
                      {nivelNombre}
                    </span>
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

                {/* Cancelar */}
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
