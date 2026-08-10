import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav/AdminBottomNav'
import { getJuegosLibres, getInscriptosJuegoLibre } from '../../services/adminApi'
import { getTorneosAdmin, getInscriptosTorneo } from '../../services/torneosApi'
import api from '../../lib/apiClient.js'
import './Admin.css'

const NIVEL_STYLE = {
  Rojo:       { background: '#fee2e2', color: '#b91c1c' },
  Intermedio: { background: '#fef9c3', color: '#92400e' },
  Azul:       { background: '#dbeafe', color: '#1d4ed8' },
}

const TZ = 'America/Argentina/Buenos_Aires'

function formatFechaHora(iso) {
  if (!iso) return '—'
  const d    = new Date(iso)
  const dia  = d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: TZ })
  const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  return `${dia} · ${hora} hs`
}

function formatFechaCorta(iso) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: TZ })
}

// ── Panel de inscriptos desplegable ──────────────────────────────────────────
function PanelInscriptos({ inscriptos, cargando, total, capacidad }) {
  if (cargando) {
    return (
      <div className="inscriptos-panel">
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div className="spinner-admin" style={{ margin: '0 auto' }} />
        </div>
      </div>
    )
  }
  return (
    <div className="inscriptos-panel">
      {inscriptos.length === 0 ? (
        <p className="inscriptos-vacio">Nadie se anotó todavía.</p>
      ) : (
        <>
          <p className="inscriptos-titulo">
            {inscriptos.length} / {capacidad} inscripto{inscriptos.length !== 1 ? 's' : ''}
          </p>
          {inscriptos.map((insc, idx) => (
            <div key={insc.id} className="inscripto-row">
              <div className="inscripto-num">{idx + 1}</div>
              <div className="inscripto-info">
                <span className="inscripto-nombre">{insc.nombre}</span>
                <span className="inscripto-email">{insc.email}</span>
                {insc.telefono && <span className="inscripto-email">{insc.telefono}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                <span
                  className="badge-nivel"
                  style={NIVEL_STYLE[insc.nivel] ?? { background: '#f3f4f6', color: '#6b7280' }}
                >
                  {insc.nivel}
                </span>
                {insc.fecha_inscripcion && (
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>{formatFechaCorta(insc.fecha_inscripcion)}</span>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

// ── Tarjeta de actividad ─────────────────────────────────────────────────────
function TarjetaActividad({ tipo, titulo, subtitulo, inscriptos, capacidad, color, onVerAnotados, abierto, cargandoInscriptos, listaInscriptos, onNavegar }) {
  const pct = capacidad > 0 ? Math.min((inscriptos / capacidad) * 100, 100) : 0
  const completo = inscriptos >= capacidad

  return (
    <div className="admin-card" style={{ overflow: 'visible' }}>
      <div style={{ padding: '14px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em',
                background: color.bg, color: color.text,
                padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {tipo}
              </span>
              {completo && (
                <span style={{ fontSize: 10, fontWeight: 700, background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: 999 }}>
                  Completo
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--admin-text)', lineHeight: 1.2 }}>{titulo}</p>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--admin-muted)' }}>{subtitulo}</p>
          </div>
        </div>

        {/* Cupo */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--admin-muted)', marginBottom: 4 }}>
            <span>{inscriptos} inscripto{inscriptos !== 1 ? 's' : ''}</span>
            <span>{capacidad} lugares</span>
          </div>
          <div style={{ height: 5, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: completo ? '#ef4444' : color.text, borderRadius: 999, transition: 'width .3s' }} />
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-secondary"
            style={{ flex: 1, padding: '8px 12px', fontSize: 12 }}
            onClick={onVerAnotados}
          >
            {abierto ? 'Ocultar' : `Ver anotados (${inscriptos})`}
          </button>
          {onNavegar && (
            <button
              className="btn-primary"
              style={{ width: 'auto', padding: '8px 12px', fontSize: 12 }}
              onClick={onNavegar}
            >
              Gestionar
            </button>
          )}
        </div>
      </div>

      {abierto && (
        <PanelInscriptos
          inscriptos={listaInscriptos}
          cargando={cargandoInscriptos}
          total={inscriptos}
          capacidad={capacidad}
        />
      )}
    </div>
  )
}

// ── Pantalla principal ───────────────────────────────────────────────────────
const COLORES = {
  entrenamiento: { bg: '#eef2ff', text: '#4f46e5' },
  juego_libre:   { bg: '#fff8e1', text: '#d97706' },
  torneo:        { bg: '#fdf4ff', text: '#7c3aed' },
}

export default function AdminActividades() {
  const navigate = useNavigate()

  const [tab,         setTab]         = useState('juego_libre') // 'juego_libre' | 'torneos' | 'turnos'
  const [juegosLibres, setJuegosLibres] = useState([])
  const [torneos,      setTorneos]      = useState([])
  const [turnos,       setTurnos]       = useState([])
  const [cargando,    setCargando]    = useState(true)

  // Estado por tarjeta: { [id]: { abierto, cargando, inscriptos } }
  const [paneles,     setPaneles]     = useState({})

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [jlRes, torRes, turRes] = await Promise.allSettled([
        getJuegosLibres(),
        getTorneosAdmin(),
        api.get('/admin/turnos/todos').then(r => r.data.data ?? []),
      ])
      if (jlRes.status === 'fulfilled')  setJuegosLibres(jlRes.value ?? [])
      if (torRes.status === 'fulfilled') setTorneos(torRes.value ?? [])
      if (turRes.status === 'fulfilled') setTurnos(turRes.value ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function togglePanel(tipo, id, capacidad) {
    const key = `${tipo}-${id}`
    const actual = paneles[key]

    if (actual?.abierto) {
      setPaneles(prev => ({ ...prev, [key]: { ...prev[key], abierto: false } }))
      return
    }

    setPaneles(prev => ({ ...prev, [key]: { abierto: true, cargando: true, inscriptos: [] } }))

    try {
      let lista = []
      if (tipo === 'jl') {
        const { data } = await getInscriptosJuegoLibre(id)
        lista = data ?? []
      } else if (tipo === 'tr') {
        const { data } = await getInscriptosTorneo(id)
        lista = data ?? []
      } else if (tipo === 'tu') {
        const res = await api.get(`/admin/turnos-inscriptos/${id}`).catch(() => null)
        lista = res?.data?.data ?? []
      }
      setPaneles(prev => ({ ...prev, [key]: { abierto: true, cargando: false, inscriptos: lista } }))
    } catch {
      setPaneles(prev => ({ ...prev, [key]: { abierto: true, cargando: false, inscriptos: [] } }))
    }
  }

  const TABS = [
    { key: 'juego_libre',   label: 'Juego libre',    count: juegosLibres.length },
    { key: 'torneos',       label: 'Torneos',         count: torneos.length },
    { key: 'turnos',        label: 'Entrenamientos',  count: turnos.length },
  ]

  const accesos = [
    { titulo: 'Nuevo juego libre', emoji: '🏓', path: '/admin/juego-libre' },
    { titulo: 'Nuevo torneo',      emoji: '🏆', path: '/admin/torneos' },
  ]

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Actividades</h1>
        <p>Próximos eventos del club</p>
      </div>

      <div className="admin-body">
        {/* Accesos rápidos */}
        <div style={{ display: 'flex', gap: 10 }}>
          {accesos.map(a => (
            <button
              key={a.path}
              className="btn-secondary"
              style={{ flex: 1, padding: '10px 8px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              onClick={() => navigate(a.path)}
            >
              {a.emoji} {a.titulo}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="mc-tabs" style={{ background: 'white', borderRadius: 12, padding: 4, display: 'flex', gap: 4, boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              style={{
                flex: 1, padding: '9px 6px', border: 'none',
                borderRadius: 9, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                background: tab === t.key ? 'var(--admin-primary)' : 'none',
                color: tab === t.key ? 'white' : 'var(--admin-muted)',
              }}
              onClick={() => setTab(t.key)}
            >
              {t.label} {t.count > 0 ? `(${t.count})` : ''}
            </button>
          ))}
        </div>

        {/* Contenido */}
        {cargando ? (
          <div className="estado-carga"><div className="spinner-admin" /></div>
        ) : (
          <>
            {/* ── Juego libre ── */}
            {tab === 'juego_libre' && (
              <>
                {juegosLibres.length === 0 ? (
                  <div className="estado-vacio">No hay juegos libres publicados.</div>
                ) : (
                  juegosLibres.map(jl => {
                    const key    = `jl-${jl.id}`
                    const panel  = paneles[key] ?? {}
                    const insc   = jl._inscriptos ?? 0
                    return (
                      <TarjetaActividad
                        key={jl.id}
                        tipo="Juego libre"
                        titulo={formatFechaHora(jl.fecha_inicio)}
                        subtitulo={`${jl.sedes?.nombre ?? 'Sede'} · hasta ${new Date(jl.fecha_fin).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })} hs`}
                        inscriptos={insc}
                        capacidad={jl.capacidad_maxima}
                        color={COLORES.juego_libre}
                        abierto={panel.abierto ?? false}
                        cargandoInscriptos={panel.cargando ?? false}
                        listaInscriptos={panel.inscriptos ?? []}
                        onVerAnotados={() => togglePanel('jl', jl.id, jl.capacidad_maxima)}
                        onNavegar={() => navigate('/admin/juego-libre')}
                      />
                    )
                  })
                )}
              </>
            )}

            {/* ── Torneos ── */}
            {tab === 'torneos' && (
              <>
                {torneos.length === 0 ? (
                  <div className="estado-vacio">No hay torneos publicados.</div>
                ) : (
                  torneos.map(t => {
                    const key   = `tr-${t.id}`
                    const panel = paneles[key] ?? {}
                    return (
                      <TarjetaActividad
                        key={t.id}
                        tipo={`Torneo · ${t.modalidad}`}
                        titulo={t.nombre}
                        subtitulo={`${formatFechaHora(t.fecha_inicio)} · ${t.sedes?.nombre ?? 'Sede'}`}
                        inscriptos={t.inscriptos ?? 0}
                        capacidad={t.capacidad_maxima}
                        color={COLORES.torneo}
                        abierto={panel.abierto ?? false}
                        cargandoInscriptos={panel.cargando ?? false}
                        listaInscriptos={panel.inscriptos ?? []}
                        onVerAnotados={() => togglePanel('tr', t.id, t.capacidad_maxima)}
                        onNavegar={() => navigate('/admin/torneos')}
                      />
                    )
                  })
                )}
              </>
            )}

            {/* ── Entrenamientos ── */}
            {tab === 'turnos' && (
              <>
                {turnos.length === 0 ? (
                  <div className="estado-vacio">No hay turnos de entrenamiento próximos.</div>
                ) : (
                  turnos.map(t => {
                    const key   = `tu-${t.id}`
                    const panel = paneles[key] ?? {}
                    return (
                      <TarjetaActividad
                        key={t.id}
                        tipo="Entrenamiento"
                        titulo={formatFechaHora(t.fecha_inicio)}
                        subtitulo={`${t.sede} · ${t.entrenador} · ${t.inscriptos}/${t.capacidad_maxima} cupos`}
                        inscriptos={t.inscriptos ?? 0}
                        capacidad={t.capacidad_maxima}
                        color={COLORES.entrenamiento}
                        abierto={panel.abierto ?? false}
                        cargandoInscriptos={panel.cargando ?? false}
                        listaInscriptos={panel.inscriptos ?? []}
                        onVerAnotados={() => togglePanel('tu', t.id, t.capacidad_maxima)}
                        onNavegar={null}
                      />
                    )
                  })
                )}
              </>
            )}
          </>
        )}
      </div>

      <AdminBottomNav />
    </div>
  )
}
