import { useState } from 'react'
import { useMisHorarios } from '../../../hooks/useEntrenador'
import BottomNavEntrenador from '../../../components/BottomNavEntrenador/BottomNavEntrenador'
import './MisHorariosEntrenador.css'

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const HORAS_DISPONIBLES = [
  '08:00','09:00','10:00','11:00','12:00','13:00',
  '14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00',
]

function getDiaJS(nombreDia) {
  // devuelve el índice 0=domingo, 1=lunes…
  const MAP = {
    lunes: 1, martes: 2, miércoles: 3, miercoles: 3,
    jueves: 4, viernes: 5, sábado: 6, sabado: 6, domingo: 0,
  }
  return MAP[nombreDia.toLowerCase()] ?? -1
}

function formatHora(iso) {
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function slotEstado(turno) {
  // estado bool en socio_turno: true=confirmado, false=pendiente
  const confirmados = (turno.socio_turno || []).filter((st) => st.estado === true)
  if (confirmados.length > 0) return 'ocupado'
  const pendientes = (turno.socio_turno || []).filter((st) => st.estado === false)
  if (pendientes.length > 0) return 'pendiente'
  return 'libre'
}

function agruparPorDia(horarios) {
  const mapa = {}
  for (const h of horarios) {
    const d = new Date(h.fecha_inicio)
    const diaN = d.toLocaleDateString('es-AR', { weekday: 'long' })
    const dia = diaN.charAt(0).toUpperCase() + diaN.slice(1)
    if (!mapa[dia]) mapa[dia] = []
    mapa[dia].push(h)
  }
  return mapa
}

export default function MisHorariosEntrenador() {
  const { horarios, sedes, cargando, guardando, agregarHorario, cancelarHorario } = useMisHorarios()
  const [dia, setDia] = useState('Lunes')
  const [hora, setHora] = useState('15:00')
  const [sedeId, setSedeId] = useState('')
  const [exito, setExito] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const [cancelando, setCancelando] = useState(null)

  const horariosPorDia = agruparPorDia(horarios)

  const handleAgregar = async () => {
    if (!sedeId) { setErrMsg('Seleccioná una sede'); return }
    setErrMsg('')
    try {
      await agregarHorario({ dia, hora, sede_id: sedeId })
      setExito(true)
      setTimeout(() => setExito(false), 3000)
    } catch (err) {
      setErrMsg(err.response?.data?.error || 'Error al guardar')
    }
  }

  const handleCancelar = async (turnoId) => {
    if (!window.confirm('¿Cancelar este horario?')) return
    try {
      setCancelando(turnoId)
      await cancelarHorario(turnoId)
    } catch (err) {
      alert(err.response?.data?.error || 'Error al cancelar')
    } finally {
      setCancelando(null)
    }
  }

  return (
    <div className="mis-horarios-e">
      <header className="mis-horarios-e-header">
        <h1>Mis horarios</h1>
        <p className="subtitulo">Disponibilidad para clases particulares</p>
      </header>

      <div className="mis-horarios-e-contenido">

        {/* ESTA SEMANA */}
        <div>
          <p className="seccion-titulo-h">Esta semana</p>
          {cargando ? (
            <div className="sin-horarios">Cargando...</div>
          ) : Object.keys(horariosPorDia).length === 0 ? (
            <div className="sin-horarios">No tenés horarios cargados esta semana.</div>
          ) : (
            <div className="horarios-semana">
              {Object.entries(horariosPorDia).map(([diaNombre, slots]) => (
                <div key={diaNombre} className="dia-horarios-fila">
                  <span className="dia-nombre">{diaNombre}</span>
                  <div className="slots-fila">
                    {slots.map((s) => {
                      const estado = slotEstado(s)
                      const etiqueta = estado === 'libre'
                        ? 'Libre'
                        : estado === 'ocupado'
                          ? 'Ocupado'
                          : 'Pendiente'
                      return (
                        <div key={s.id} className="slot-row">
                          <div className="slot-row-info">
                            <span className={`slot-chip ${estado}`}>
                              {formatHora(s.fecha_inicio)} · {etiqueta}
                            </span>
                            {s.sedes?.nombre && (
                              <span className="slot-sede">📍 {s.sedes.nombre}</span>
                            )}
                          </div>
                          <button
                            className="btn-cancelar-slot"
                            disabled={cancelando === s.id}
                            onClick={() => handleCancelar(s.id)}
                            title="Cancelar horario"
                          >
                            {cancelando === s.id ? '...' : '✕'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AGREGAR DISPONIBILIDAD */}
        <div className="agregar-disp-card">
          <p className="seccion-titulo-h">Agregar disponibilidad</p>

          {exito && <div className="toast-ok">✓ Horario agregado correctamente</div>}
          {errMsg && <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 8px' }}>{errMsg}</p>}

          <div className="form-field">
            <label className="form-label">Día</label>
            <select
              className="form-select"
              value={dia}
              onChange={(e) => setDia(e.target.value)}
            >
              {DIAS_SEMANA.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">Hora</label>
            <select
              className="form-select"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
            >
              {HORAS_DISPONIBLES.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">Sede</label>
            <select
              className="form-select"
              value={sedeId}
              onChange={(e) => setSedeId(e.target.value)}
            >
              <option value="">Seleccionar sede</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          <button
            className="btn-agregar-horario"
            disabled={guardando}
            onClick={handleAgregar}
          >
            {guardando ? 'Guardando...' : 'Agregar horario'}
          </button>
        </div>

      </div>

      <BottomNavEntrenador />
    </div>
  )
}
