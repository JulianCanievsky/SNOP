/**
 * MisClases.jsx — Panel del socio para ver sus clases del mes y cancelarlas.
 * Sistema de bonos/créditos eliminado. Cancelación directa sobre SOCIO_TURNO.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/apiClient.js'
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

export default function MisClases() {
  const navigate = useNavigate()

  const [clases,      setClases]      = useState([])
  const [enEspera,    setEnEspera]    = useState([])
  const [cargando,    setCargando]    = useState(true)
  const [error,       setError]       = useState(null)
  const [procesando,  setProcesando]  = useState(null)
  const [mensaje,     setMensaje]     = useState('')
  const [errorLocal,  setErrorLocal]  = useState('')
  const [tab,         setTab]         = useState('clases') // 'clases' | 'espera'

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const [clasesRes, esperaRes] = await Promise.all([
        api.get('/turnos').then(r => r.data.data ?? []),
        api.get('/turnos/lista-espera/mis-solicitudes').then(r => r.data.data ?? []).catch(() => []),
      ])
      setClases(clasesRes)
      setEnEspera(esperaRes)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron cargar las clases')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  function mostrarMensaje(msg, esError = false) {
    if (esError) setErrorLocal(msg)
    else setMensaje(msg)
    setTimeout(() => { setMensaje(''); setErrorLocal('') }, 4000)
  }

  async function handleCancelar(turnoId) {
    if (procesando) return
    setProcesando(turnoId)
    try {
      await api.delete(`/turnos/${turnoId}`)
      mostrarMensaje('Clase cancelada correctamente.')
      await cargar()
    } catch (err) {
      mostrarMensaje(err.response?.data?.mensaje || 'No se pudo cancelar', true)
    } finally {
      setProcesando(null)
    }
  }

  async function handleSalirEspera(turnoId) {
    if (procesando) return
    setProcesando(`espera-${turnoId}`)
    try {
      await api.delete(`/turnos/${turnoId}/lista-espera/yo`)
      mostrarMensaje('Saliste de la lista de espera.')
      await cargar()
    } catch (err) {
      mostrarMensaje(err.response?.data?.error || 'No se pudo quitar de la lista', true)
    } finally {
      setProcesando(null)
    }
  }

  // Separar clases futuras y pasadas
  const ahora = new Date()
  const clasesFuturas = clases.filter(c => c.turnos?.fecha_inicio && new Date(c.turnos.fecha_inicio) >= ahora)
  const clasesPasadas = clases.filter(c => c.turnos?.fecha_inicio && new Date(c.turnos.fecha_inicio) < ahora)

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

  if (error) {
    return (
      <div className="mis-clases">
        <header className="mc-header">
          <button className="mc-volver" onClick={() => navigate(-1)}>←</button>
          <h1>Mis clases</h1>
        </header>
        <div className="mc-error">
          <p>{error}</p>
          <button className="mc-btn-primary" onClick={cargar}>Reintentar</button>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="mis-clases">
      <header className="mc-header">
        <button className="mc-volver" onClick={() => navigate(-1)}>←</button>
        <h1>Mis clases</h1>
        <p className="mc-subtitulo">Turnos de entrenamiento inscriptos</p>
      </header>

      <div className="mc-body">
        {mensaje    && <div className="mc-alerta mc-alerta--ok">✓ {mensaje}</div>}
        {errorLocal && <div className="mc-alerta mc-alerta--error">{errorLocal}</div>}

        {/* Resumen rápido */}
        <div className="mc-resumen-card">
          <div className="mc-resumen-item">
            <span className="mc-resumen-val">{clasesFuturas.length}</span>
            <span className="mc-resumen-lbl">Próximas</span>
          </div>
          <div className="mc-resumen-sep" />
          <div className="mc-resumen-item">
            <span className="mc-resumen-val">{clasesPasadas.length}</span>
            <span className="mc-resumen-lbl">Tomadas</span>
          </div>
          <div className="mc-resumen-sep" />
          <div className="mc-resumen-item">
            <span className="mc-resumen-val" style={{ color: enEspera.length > 0 ? '#f59e0b' : '#94a3b8' }}>
              {enEspera.length}
            </span>
            <span className="mc-resumen-lbl">En espera</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="mc-tabs">
          <button
            className={`mc-tab${tab === 'clases' ? ' mc-tab--activo' : ''}`}
            onClick={() => setTab('clases')}
          >
            Clases ({clases.length})
          </button>
          <button
            className={`mc-tab${tab === 'espera' ? ' mc-tab--activo' : ''}`}
            onClick={() => setTab('espera')}
          >
            Lista de espera ({enEspera.length})
          </button>
        </div>

        {/* Tab: Clases */}
        {tab === 'clases' && (
          <div className="mc-lista">
            {clases.length === 0 ? (
              <div className="mc-vacio">No tenés clases asignadas todavía.</div>
            ) : (
              <>
                {clasesFuturas.length > 0 && (
                  <>
                    <div className="mc-seccion-titulo">Próximas</div>
                    {clasesFuturas.map(c => {
                      const t = c.turnos
                      return (
                        <div key={c.id} className="mc-clase-row">
                          <div className="mc-clase-info">
                            <span className="mc-clase-fecha">
                              {formatFecha(t?.fecha_inicio)} {formatHora(t?.fecha_inicio)} hs
                            </span>
                            <span className="mc-clase-sede">
                              {t?.sedes?.nombre ?? ''}
                              {t?.users?.nombre ? ` · ${t.users.nombre}` : ''}
                              {t?.tipo_turno?.nombre ? ` · ${t.tipo_turno.nombre}` : ''}
                            </span>
                          </div>
                          <button
                            className="mc-btn-cancelar"
                            onClick={() => handleCancelar(t?.id)}
                            disabled={procesando === t?.id}
                          >
                            {procesando === t?.id ? '...' : 'Cancelar'}
                          </button>
                        </div>
                      )
                    })}
                  </>
                )}
                {clasesPasadas.length > 0 && (
                  <>
                    <div className="mc-seccion-titulo mc-seccion-titulo--pasadas">Historial</div>
                    {clasesPasadas.map(c => {
                      const t = c.turnos
                      return (
                        <div key={c.id} className="mc-clase-row mc-clase-row--pasada">
                          <div className="mc-clase-info">
                            <span className="mc-clase-fecha">
                              {formatFecha(t?.fecha_inicio)} {formatHora(t?.fecha_inicio)} hs
                            </span>
                            <span className="mc-clase-sede">
                              {t?.sedes?.nombre ?? ''}
                              {t?.users?.nombre ? ` · ${t.users.nombre}` : ''}
                            </span>
                          </div>
                          <span className="mc-badge-pasado">Finalizada</span>
                        </div>
                      )
                    })}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab: Lista de espera */}
        {tab === 'espera' && (
          <div className="mc-lista">
            {enEspera.length === 0 ? (
              <div className="mc-vacio">No estás en ninguna lista de espera.</div>
            ) : (
              enEspera.map(e => {
                const t = e.turnos
                return (
                  <div key={e.id} className="mc-clase-row">
                    <div className="mc-clase-info">
                      <span className="mc-clase-fecha">
                        {formatFecha(t?.fecha_inicio)} {formatHora(t?.fecha_inicio)} hs
                      </span>
                      <span className="mc-clase-sede">
                        {t?.sedes?.nombre ?? ''}
                        {t?.users?.nombre ? ` · ${t.users.nombre}` : ''}
                      </span>
                      <span className="mc-espera-pos">
                        Posición #{e.posicion ?? '—'}
                      </span>
                    </div>
                    <button
                      className="mc-btn-cancelar"
                      onClick={() => handleSalirEspera(t?.id)}
                      disabled={procesando === `espera-${t?.id}`}
                    >
                      {procesando === `espera-${t?.id}` ? '...' : 'Salir'}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
