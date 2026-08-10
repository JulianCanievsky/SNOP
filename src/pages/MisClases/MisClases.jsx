/**
 * MisClases.jsx — Panel del socio para ver su bono mensual,
 * cancelar una clase con crédito y reprogramar.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBonos } from '../../hooks/useBonos'
import BottomNav from '../../components/BottomNav/BottomNav'
import './MisClases.css'

const TZ = 'America/Argentina/Buenos_Aires'

const formatFecha = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', {
    weekday: 'short', day: '2-digit', month: '2-digit', timeZone: TZ,
  })
}

const formatHora = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
}

const formatVencimiento = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: TZ })
}

export default function MisClases() {
  const navigate = useNavigate()
  const {
    resumen,
    turnosDisp,
    cargando,
    cargandoTurnos,
    error,
    cargar,
    cargarTurnosReprog,
    cancelar,
    reprogramar,
  } = useBonos()

  const [tab,           setTab]           = useState('clases') // 'clases' | 'creditos'
  const [procesando,    setProcesando]    = useState(null)     // socioTurnoId o creditoId
  const [mensaje,       setMensaje]       = useState('')
  const [errorLocal,    setErrorLocal]    = useState('')

  // Estado del modal de reprogramación
  const [modalCredito,  setModalCredito]  = useState(null)     // crédito seleccionado
  const [turnoReprog,   setTurnoReprog]   = useState('')

  function mostrarMensaje(msg, esError = false) {
    if (esError) setErrorLocal(msg)
    else setMensaje(msg)
    setTimeout(() => { setMensaje(''); setErrorLocal('') }, 4000)
  }

  async function handleCancelar(socioTurnoId) {
    if (procesando) return
    setProcesando(socioTurnoId)
    try {
      const res = await cancelar(socioTurnoId)
      mostrarMensaje(res.mensaje)
    } catch (err) {
      mostrarMensaje(err.response?.data?.error || 'No se pudo cancelar', true)
    } finally {
      setProcesando(null)
    }
  }

  async function handleAbrirReprog(credito) {
    setModalCredito(credito)
    setTurnoReprog('')
    setErrorLocal('')
    await cargarTurnosReprog()
  }

  async function handleReprogramar() {
    if (!turnoReprog || !modalCredito) return
    setProcesando(modalCredito.id)
    try {
      const res = await reprogramar(modalCredito.id, parseInt(turnoReprog))
      setModalCredito(null)
      mostrarMensaje(res.mensaje)
    } catch (err) {
      mostrarMensaje(err.response?.data?.error || 'No se pudo reprogramar', true)
    } finally {
      setProcesando(null)
    }
  }

  if (cargando) {
    return (
      <div className="mis-clases">
        <header className="mc-header">
          <button className="mc-volver" onClick={() => navigate(-1)}>←</button>
          <h1>Mis clases</h1>
        </header>
        <div className="mc-cargando"><div className="mc-spinner" /><p>Cargando...</p></div>
        <BottomNav />
      </div>
    )
  }

  if (error || !resumen) {
    return (
      <div className="mis-clases">
        <header className="mc-header">
          <button className="mc-volver" onClick={() => navigate(-1)}>←</button>
          <h1>Mis clases</h1>
        </header>
        <div className="mc-error">
          <p>{error || 'No se pudo cargar el bono'}</p>
          <button className="mc-btn-primary" onClick={cargar}>Reintentar</button>
        </div>
        <BottomNav />
      </div>
    )
  }

  const { abono, clases_mensuales, tomadas, clases_detalle, creditos_disponibles, creditos, horas_min_cancelacion } = resumen
  const creditosActivos = creditos.filter(c => !c.usado && new Date(c.fecha_vencimiento) >= new Date())
  const creditosUsados  = creditos.filter(c => c.usado)

  return (
    <div className="mis-clases">
      <header className="mc-header">
        <button className="mc-volver" onClick={() => navigate(-1)}>←</button>
        <h1>Mis clases</h1>
        <p className="mc-subtitulo">Bono mensual y reprogramaciones</p>
      </header>

      <div className="mc-body">
        {mensaje    && <div className="mc-alerta mc-alerta--ok">✓ {mensaje}</div>}
        {errorLocal && <div className="mc-alerta mc-alerta--error">{errorLocal}</div>}

        {/* ── Tarjeta resumen del bono ── */}
        {abono ? (
          <div className="mc-bono-card">
            <div className="mc-bono-plan">{abono.plan_nombre}</div>
            <div className="mc-bono-nums">
              <div className="mc-bono-num">
                <span className="mc-bono-val">{tomadas}</span>
                <span className="mc-bono-lbl">Tomadas</span>
              </div>
              <div className="mc-bono-sep" />
              <div className="mc-bono-num">
                <span className="mc-bono-val">{clases_mensuales}</span>
                <span className="mc-bono-lbl">Contratadas</span>
              </div>
              <div className="mc-bono-sep" />
              <div className="mc-bono-num">
                <span className="mc-bono-val" style={{ color: creditos_disponibles > 0 ? '#22c55e' : '#94a3b8' }}>
                  {creditos_disponibles}
                </span>
                <span className="mc-bono-lbl">Créditos</span>
              </div>
            </div>
            {/* Barra de progreso */}
            <div className="mc-barra">
              <div
                className="mc-barra-relleno"
                style={{ width: `${Math.min((tomadas / clases_mensuales) * 100, 100)}%` }}
              />
            </div>
            <p className="mc-bono-hint">
              Podés cancelar hasta {horas_min_cancelacion}hs antes para obtener un crédito de reprogramación.
            </p>
          </div>
        ) : (
          <div className="mc-sin-abono">
            <p>No tenés un abono activo este mes.</p>
            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
              Consultá con el admin para que te asigne uno.
            </p>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="mc-tabs">
          <button
            className={`mc-tab${tab === 'clases' ? ' mc-tab--activo' : ''}`}
            onClick={() => setTab('clases')}
          >
            Clases del mes ({(clases_detalle ?? []).length})
          </button>
          <button
            className={`mc-tab${tab === 'creditos' ? ' mc-tab--activo' : ''}`}
            onClick={() => setTab('creditos')}
          >
            Créditos ({creditosActivos.length})
          </button>
        </div>

        {/* ── Tab: Clases del mes ── */}
        {tab === 'clases' && (
          <div className="mc-lista">
            {(clases_detalle ?? []).length === 0 ? (
              <div className="mc-vacio">No tomaste clases este mes todavía.</div>
            ) : (
              clases_detalle.map(c => {
                const t = c.turnos
                const esPasado = t?.fecha_inicio && new Date(t.fecha_inicio) < new Date()
                return (
                  <div key={c.id} className="mc-clase-row">
                    <div className="mc-clase-info">
                      <span className="mc-clase-fecha">
                        {formatFecha(t?.fecha_inicio)} {formatHora(t?.fecha_inicio)} hs
                      </span>
                      <span className="mc-clase-sede">
                        {t?.sedes?.nombre ?? ''}
                        {t?.users?.nombre ? ` · ${t.users.nombre}` : ''}
                      </span>
                    </div>
                    {!esPasado && abono && (
                      <button
                        className="mc-btn-cancelar"
                        onClick={() => handleCancelar(c.id)}
                        disabled={procesando === c.id}
                      >
                        {procesando === c.id ? '...' : 'Cancelar'}
                      </button>
                    )}
                    {esPasado && <span className="mc-badge-pasado">Finalizada</span>}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── Tab: Créditos ── */}
        {tab === 'creditos' && (
          <div className="mc-lista">
            {creditosActivos.length === 0 && creditosUsados.length === 0 ? (
              <div className="mc-vacio">No tenés créditos este mes.</div>
            ) : (
              <>
                {creditosActivos.map(c => (
                  <div key={c.id} className="mc-credito-row">
                    <div className="mc-credito-info">
                      <span className="mc-credito-titulo">Crédito disponible</span>
                      <span className="mc-credito-sub">
                        Generado el {formatFecha(c.fecha_generado)}
                      </span>
                      <span className="mc-credito-vence">
                        Vence: {formatVencimiento(c.fecha_vencimiento)}
                      </span>
                    </div>
                    <button
                      className="mc-btn-primary"
                      style={{ padding: '8px 14px', fontSize: 13 }}
                      onClick={() => handleAbrirReprog(c)}
                      disabled={!!procesando}
                    >
                      Reprogramar
                    </button>
                  </div>
                ))}
                {creditosUsados.map(c => (
                  <div key={c.id} className="mc-credito-row mc-credito-row--usado">
                    <div className="mc-credito-info">
                      <span className="mc-credito-titulo">Crédito utilizado</span>
                      <span className="mc-credito-sub">
                        Usado el {formatFecha(c.fecha_generado)}
                        {c.turnos_usado?.fecha_inicio
                          ? ` → ${formatFecha(c.turnos_usado.fecha_inicio)}`
                          : ''}
                      </span>
                    </div>
                    <span className="mc-badge-usado">Usado</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Modal de reprogramación ── */}
      {modalCredito && (
        <div className="mc-modal-overlay" onClick={() => setModalCredito(null)}>
          <div className="mc-modal" onClick={e => e.stopPropagation()}>
            <h2 className="mc-modal-titulo">Reprogramar clase</h2>
            <p className="mc-modal-sub">Elegí el turno al que querés asistir con este crédito.</p>

            {cargandoTurnos ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div className="mc-spinner" style={{ margin: '0 auto' }} />
              </div>
            ) : turnosDisp.length === 0 ? (
              <p style={{ fontSize: 13, color: '#6b7280', margin: '12px 0' }}>
                No hay turnos disponibles con cupo en este momento.
              </p>
            ) : (
              <select
                className="mc-select"
                value={turnoReprog}
                onChange={e => setTurnoReprog(e.target.value)}
              >
                <option value="">Seleccioná un turno...</option>
                {turnosDisp.map(t => (
                  <option key={t.id} value={t.id}>
                    {formatFecha(t.fecha_inicio)} {formatHora(t.fecha_inicio)} hs
                    · {t.sede} · {t.entrenador}
                    ({t.cupo_disponible} cupo{t.cupo_disponible !== 1 ? 's' : ''})
                  </option>
                ))}
              </select>
            )}

            {errorLocal && (
              <div className="mc-alerta mc-alerta--error" style={{ marginTop: 10 }}>
                {errorLocal}
              </div>
            )}

            <div className="mc-modal-acciones">
              <button className="mc-btn-secondary" onClick={() => setModalCredito(null)}>
                Cancelar
              </button>
              <button
                className="mc-btn-primary"
                onClick={handleReprogramar}
                disabled={!turnoReprog || procesando === modalCredito.id}
              >
                {procesando === modalCredito.id ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
