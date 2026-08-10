import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav/AdminBottomNav'
import {
  getSedes,
  crearJuegoLibre,
  getJuegosLibres,
  borrarJuegoLibre,
  getInscriptosJuegoLibre,
} from '../../services/adminApi'
import './Admin.css'

const MESAS_POR_NIVEL = 4

export default function CrearJuegoLibre() {
  const navigate = useNavigate()

  const [sedes,      setSedes]      = useState([])
  const [publicados, setPublicados] = useState([])
  const [cargando,   setCargando]   = useState(true)
  const [enviando,   setEnviando]   = useState(false)
  const [exito,      setExito]      = useState(false)
  const [error,      setError]      = useState('')

  // Modal de inscriptos
  const [modalEventoId,   setModalEventoId]   = useState(null)
  const [inscriptos,      setInscriptos]      = useState([])
  const [cargandoModal,   setCargandoModal]   = useState(false)

  const [form, setForm] = useState({
    sede_id:             '',
    fecha:               '',
    hora_inicio:         '20:00',
    hora_fin:            '21:30',
    cantidad_mesas:      3,
    niveles_habilitados: ['Rojo', 'Intermedio', 'Azul'],
  })

  const capacidad = form.cantidad_mesas * MESAS_POR_NIVEL

  useEffect(() => {
    Promise.all([getSedes(), getJuegosLibres()])
      .then(([s, p]) => { setSedes(s); setPublicados(p) })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: name === 'cantidad_mesas' ? Number(value) : value }))
    setError('')
  }

  function toggleNivel(nivel) {
    setForm(prev => {
      const ya = prev.niveles_habilitados.includes(nivel)
      return {
        ...prev,
        niveles_habilitados: ya
          ? prev.niveles_habilitados.filter(n => n !== nivel)
          : [...prev.niveles_habilitados, nivel],
      }
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.sede_id || !form.fecha || !form.hora_inicio || !form.hora_fin) {
      setError('Completá todos los campos obligatorios')
      return
    }
    setEnviando(true)
    try {
      await crearJuegoLibre({ ...form, capacidad_maxima: capacidad })
      setExito(true)
      const nuevos = await getJuegosLibres()
      setPublicados(nuevos)
      setForm(prev => ({ ...prev, fecha: '', sede_id: '' }))
      setTimeout(() => setExito(false), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear espacio')
    } finally {
      setEnviando(false)
    }
  }

  async function eliminar(id) {
    if (!window.confirm('¿Borrar este espacio de juego?')) return
    try {
      await borrarJuegoLibre(id)
      setPublicados(prev => prev.filter(p => p.id !== id))
      if (modalEventoId === id) setModalEventoId(null)
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar')
    }
  }

  async function verInscriptos(eventoId) {
    // Toggle: cerrar si ya está abierto
    if (modalEventoId === eventoId) {
      setModalEventoId(null)
      return
    }
    setModalEventoId(eventoId)
    setCargandoModal(true)
    try {
      const { data } = await getInscriptosJuegoLibre(eventoId)
      setInscriptos(data ?? [])
    } catch (err) {
      console.error(err)
      setInscriptos([])
    } finally {
      setCargandoModal(false)
    }
  }

  const TZ = 'America/Argentina/Buenos_Aires'

  function formatFechaHora(iso) {
    const d    = new Date(iso)
    const dia  = d.toLocaleDateString('es-AR', {
      weekday: 'short', day: '2-digit', month: '2-digit', timeZone: TZ,
    })
    const hora = d.toLocaleTimeString('es-AR', {
      hour: '2-digit', minute: '2-digit', timeZone: TZ,
    })
    return `${dia} · ${hora} hs`
  }

  function formatFechaInsc(iso) {
    return new Date(iso).toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: '2-digit', timeZone: TZ,
    })
  }

  const NIVEL_STYLE = {
    Rojo:        { background: '#fee2e2', color: '#b91c1c' },
    Intermedio:  { background: '#fef9c3', color: '#92400e' },
    Azul:        { background: '#dbeafe', color: '#1d4ed8' },
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <button className="btn-volver-admin" onClick={() => navigate('/admin')}>‹ Inicio</button>
        <h1>Crear juego libre</h1>
        <p>Nuevo espacio de juego</p>
      </div>

      <div className="admin-body">
        {exito && <div className="alerta-exito">✓ Espacio publicado correctamente</div>}
        {error && <div className="alerta-error">{error}</div>}

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Sede</label>
            <select name="sede_id" className="form-select" value={form.sede_id} onChange={handleChange}>
              <option value="">Seleccioná una sede</option>
              {sedes.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Fecha</label>
            <input name="fecha" type="date" className="form-input"
              value={form.fecha} onChange={handleChange} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label>Inicio</label>
              <input name="hora_inicio" type="time" className="form-input"
                value={form.hora_inicio} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Fin</label>
              <input name="hora_fin" type="time" className="form-input"
                value={form.hora_fin} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label>Cantidad de mesas</label>
            <input name="cantidad_mesas" type="number" min="1" max="20" className="form-input"
              value={form.cantidad_mesas} onChange={handleChange} />
          </div>

          <div className="cupo-calculado">
            Capacidad máxima calculada: <strong>{capacidad} jugadores</strong>
          </div>

          <div className="form-group">
            <label>Niveles habilitados</label>
            <div className="checkboxes-row">
              {['Rojo', 'Intermedio', 'Azul'].map(n => (
                <label key={n} className="checkbox-nivel">
                  <input
                    type="checkbox"
                    checked={form.niveles_habilitados.includes(n)}
                    onChange={() => toggleNivel(n)}
                  />
                  {n}
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={enviando}>
            {enviando ? 'Publicando...' : 'Publicar espacio'}
          </button>
        </form>

        {/* ── Publicados ── */}
        {publicados.length > 0 && (
          <div>
            <p className="admin-label">Publicados</p>
            <div className="admin-card">
              {cargando ? (
                <div className="estado-carga"><div className="spinner-admin" /></div>
              ) : (
                publicados.map(p => {
                  const abierto = modalEventoId === p.id
                  return (
                    <div key={p.id}>
                      <div className="juego-libre-item">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="juego-libre-fecha">{formatFechaHora(p.fecha_inicio)}</p>
                          <p className="juego-libre-sub">
                            {p.sedes?.nombre ?? 'Sede'} · {p.capacidad_maxima} lugares
                          </p>
                          {/* Contador de inscriptos */}
                          {p._inscriptos !== undefined && (
                            <p style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600, margin: '2px 0 0' }}>
                              {p._inscriptos} anotado{p._inscriptos !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <button
                            className="btn-secondary"
                            style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}
                            onClick={() => verInscriptos(p.id)}
                          >
                            {abierto ? 'Cerrar' : 'Ver anotados'}
                          </button>
                          <button className="btn-danger" onClick={() => eliminar(p.id)}>Borrar</button>
                        </div>
                      </div>

                      {/* ── Panel desplegable de inscriptos ── */}
                      {abierto && (
                        <div className="inscriptos-panel">
                          {cargandoModal ? (
                            <div style={{ textAlign: 'center', padding: '16px 0' }}>
                              <div className="spinner-admin" style={{ margin: '0 auto 8px' }} />
                              <span style={{ fontSize: 13, color: '#6b7280' }}>Cargando...</span>
                            </div>
                          ) : inscriptos.length === 0 ? (
                            <p className="inscriptos-vacio">Nadie se anotó todavía.</p>
                          ) : (
                            <>
                              <p className="inscriptos-titulo">
                                {inscriptos.length} anotado{inscriptos.length !== 1 ? 's' : ''}
                              </p>
                              {inscriptos.map((insc, idx) => (
                                <div key={insc.id} className="inscripto-row">
                                  <div className="inscripto-num">{idx + 1}</div>
                                  <div className="inscripto-info">
                                    <span className="inscripto-nombre">{insc.nombre}</span>
                                    <span className="inscripto-email">{insc.email}</span>
                                    {insc.telefono && (
                                      <span className="inscripto-email">{insc.telefono}</span>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                    <span
                                      className="badge-nivel"
                                      style={NIVEL_STYLE[insc.nivel] ?? { background: '#f3f4f6', color: '#6b7280' }}
                                    >
                                      {insc.nivel}
                                    </span>
                                    <span style={{ fontSize: 10, color: '#9ca3af' }}>
                                      {formatFechaInsc(insc.fecha_inscripcion)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      <AdminBottomNav />
    </div>
  )
}
