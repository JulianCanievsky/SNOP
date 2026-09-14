import { useState, useMemo } from 'react'
import { useMisHorarios } from '../../../hooks/useEntrenador'
import BottomNavEntrenador from '../../../components/BottomNavEntrenador/BottomNavEntrenador'
import './MisHorariosEntrenador.css'

const TZ = 'America/Argentina/Buenos_Aires'

const DURACIONES = [
  { label: '30 min',   value: 30  },
  { label: '45 min',   value: 45  },
  { label: '1 hora',   value: 60  },
  { label: '1h 30min', value: 90  },
  { label: '2 horas',  value: 120 },
]

const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

function formatHora(iso) {
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ,
  })
}

function slotEstado(turno) {
  const confirmados = (turno.socio_turno || []).filter(st => st.estado === true)
  if (confirmados.length > 0) return 'ocupado'
  const pendientes = (turno.socio_turno || []).filter(st => st.estado === false)
  if (pendientes.length > 0) return 'pendiente'
  return 'libre'
}

function agruparPorDia(horarios) {
  const mapa = {}
  for (const h of horarios) {
    const d = new Date(h.fecha_inicio)
    const diaN = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ })
    const key  = d.toLocaleDateString('es-AR', { weekday: 'long', timeZone: TZ })
    const dia  = key.charAt(0).toUpperCase() + key.slice(1)
    if (!mapa[dia]) mapa[dia] = []
    mapa[dia].push(h)
  }
  return mapa
}

/** Genera los días del mes para el mini-calendario */
function generarCalendario(anio, mes) {
  const primerDia = new Date(anio, mes, 1).getDay() // 0=Dom
  const diasEnMes = new Date(anio, mes + 1, 0).getDate()
  const celdas = []
  // Relleno inicial
  for (let i = 0; i < primerDia; i++) celdas.push(null)
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d)
  return celdas
}

function pad2(n) { return String(n).padStart(2, '0') }

export default function MisHorariosEntrenador() {
  const { horarios, sedes, cargando, guardando, agregarHorario, cancelarHorario } = useMisHorarios()

  // Estado del calendario
  const hoyAR     = new Date().toLocaleString('en-CA', { timeZone: TZ }).slice(0, 10)
  const [anio, setAnio] = useState(() => Number(hoyAR.slice(0, 4)))
  const [mes,  setMes]  = useState(() => Number(hoyAR.slice(5, 7)) - 1)
  const [fechaSel, setFechaSel] = useState('')   // YYYY-MM-DD

  const [hora,     setHora]     = useState('09:00')
  const [sedeId,   setSedeId]   = useState('')
  const [duracion, setDuracion] = useState(60)
  const [exito,    setExito]    = useState(false)
  const [errMsg,   setErrMsg]   = useState('')
  const [cancelando, setCancelando] = useState(null)

  const horariosPorDia = agruparPorDia(horarios)
  const celdas         = useMemo(() => generarCalendario(anio, mes), [anio, mes])

  function mesAnterior() {
    if (mes === 0) { setMes(11); setAnio(a => a - 1) }
    else setMes(m => m - 1)
  }
  function mesSiguiente() {
    if (mes === 11) { setMes(0); setAnio(a => a + 1) }
    else setMes(m => m + 1)
  }

  function seleccionarDia(dia) {
    if (!dia) return
    const f = `${anio}-${pad2(mes + 1)}-${pad2(dia)}`
    if (f < hoyAR) return          // bloquear pasados
    setFechaSel(f === fechaSel ? '' : f)
  }

  const handleAgregar = async () => {
    if (!fechaSel) { setErrMsg('Seleccioná una fecha en el calendario'); return }
    if (!sedeId)   { setErrMsg('Seleccioná una sede'); return }
    setErrMsg('')
    try {
      await agregarHorario({ fecha: fechaSel, hora, sede_id: sedeId, duracion_min: duracion })
      setExito(true)
      setFechaSel('')
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

  // Label de la fecha seleccionada
  const labelFechaSel = fechaSel
    ? new Date(`${fechaSel}T12:00:00`).toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ,
      })
    : null

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
                      const estado  = slotEstado(s)
                      const etiqueta = estado === 'libre' ? 'Libre' : estado === 'ocupado' ? 'Ocupado' : 'Pendiente'
                      return (
                        <div key={s.id} className="slot-row">
                          <div className="slot-row-info">
                            <span className={`slot-chip ${estado}`}>
                              {formatHora(s.fecha_inicio)} · {etiqueta}
                              {s.duracion_min && <span className="slot-duracion"> · {s.duracion_min}min</span>}
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
          {errMsg && <p className="form-error">{errMsg}</p>}

          {/* ── MINI CALENDARIO ── */}
          <div className="cal-wrap">
            {/* Navegación de mes */}
            <div className="cal-nav">
              <button className="cal-nav-btn" onClick={mesAnterior} aria-label="Mes anterior">‹</button>
              <span className="cal-nav-titulo">{MESES[mes]} {anio}</span>
              <button className="cal-nav-btn" onClick={mesSiguiente} aria-label="Mes siguiente">›</button>
            </div>

            {/* Cabecera días */}
            <div className="cal-grid cal-header">
              {DIAS_CORTO.map(d => (
                <span key={d} className="cal-dia-lbl">{d}</span>
              ))}
            </div>

            {/* Días del mes */}
            <div className="cal-grid">
              {celdas.map((dia, i) => {
                if (!dia) return <span key={`e-${i}`} />
                const f       = `${anio}-${pad2(mes + 1)}-${pad2(dia)}`
                const pasado  = f < hoyAR
                const hoy     = f === hoyAR
                const sel     = f === fechaSel
                return (
                  <button
                    key={f}
                    className={`cal-dia${pasado ? ' cal-dia--pasado' : ''}${hoy ? ' cal-dia--hoy' : ''}${sel ? ' cal-dia--sel' : ''}`}
                    onClick={() => seleccionarDia(dia)}
                    disabled={pasado}
                    type="button"
                  >
                    {dia}
                  </button>
                )
              })}
            </div>

            {/* Fecha seleccionada */}
            {labelFechaSel && (
              <p className="cal-fecha-sel-label">📅 {labelFechaSel}</p>
            )}
          </div>

          {/* ── HORA ── */}
          <div className="form-field">
            <label className="form-label">Hora</label>
            <input
              type="time"
              className="form-input-time"
              value={hora}
              min="06:00"
              max="23:00"
              step="1800"
              onChange={e => setHora(e.target.value)}
            />
          </div>

          {/* ── DURACIÓN ── */}
          <div className="form-field">
            <label className="form-label">Duración</label>
            <div className="dur-chips">
              {DURACIONES.map(d => (
                <button
                  key={d.value}
                  type="button"
                  className={`dur-chip${duracion === d.value ? ' dur-chip--sel' : ''}`}
                  onClick={() => setDuracion(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── SEDE ── */}
          <div className="form-field">
            <label className="form-label">Sede</label>
            <select
              className="form-select"
              value={sedeId}
              onChange={e => setSedeId(e.target.value)}
            >
              <option value="">Seleccionar sede</option>
              {sedes.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          <button
            className="btn-agregar-horario"
            disabled={guardando || !fechaSel}
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
