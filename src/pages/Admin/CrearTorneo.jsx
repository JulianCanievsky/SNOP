import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav/AdminBottomNav'
import { getSedes } from '../../services/adminApi'
import { crearTorneo, getTorneosAdmin, borrarTorneo, getInscriptosTorneo, quitarInscriptoTorneo } from '../../services/torneosApi'
import './Admin.css'

const NIVEL_STYLE = {
  Rojo:       { background: '#fee2e2', color: '#b91c1c' },
  Intermedio: { background: '#fef9c3', color: '#92400e' },
  Azul:       { background: '#dbeafe', color: '#1d4ed8' },
}

export default function CrearTorneo() {
  const navigate = useNavigate()

  const [sedes,      setSedes]      = useState([])
  const [publicados, setPublicados] = useState([])
  const [cargando,   setCargando]   = useState(true)
  const [enviando,   setEnviando]   = useState(false)
  const [exito,      setExito]      = useState(false)
  const [error,      setError]      = useState('')

  // Modal inscriptos
  const [modalId,        setModalId]        = useState(null)
  const [inscriptos,     setInscriptos]     = useState([])
  const [cargandoModal,  setCargandoModal]  = useState(false)
  const [quitando,       setQuitando]       = useState(null) // id de inscripto siendo eliminado

  const [form, setForm] = useState({
    nombre:              '',
    sede_id:             '',
    fecha:               '',
    hora_inicio:         '09:00',
    hora_fin:            '13:00',
    modalidad:           'singles',
    capacidad_maxima:    16,
    niveles_habilitados: ['Rojo', 'Intermedio', 'Azul'],
  })

  useEffect(() => {
    Promise.all([getSedes(), getTorneosAdmin()])
      .then(([s, p]) => { setSedes(s); setPublicados(p) })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({
      ...prev,
      [name]: name === 'capacidad_maxima' ? Number(value) : value,
    }))
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
    if (!form.nombre.trim() || !form.sede_id || !form.fecha || !form.modalidad) {
      setError('Completá todos los campos obligatorios')
      return
    }
    setEnviando(true)
    try {
      await crearTorneo(form)
      setExito(true)
      const nuevos = await getTorneosAdmin()
      setPublicados(nuevos)
      setForm(prev => ({ ...prev, nombre: '', fecha: '', sede_id: '' }))
      setTimeout(() => setExito(false), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear torneo')
    } finally {
      setEnviando(false)
    }
  }

  async function eliminar(id) {
    if (!window.confirm('¿Borrar este torneo?')) return
    try {
      await borrarTorneo(id)
      setPublicados(prev => prev.filter(p => p.id !== id))
      if (modalId === id) setModalId(null)
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar')
    }
  }

  async function verInscriptos(id) {
    if (modalId === id) { setModalId(null); return }
    setModalId(id)
    setCargandoModal(true)
    try {
      const { data } = await getInscriptosTorneo(id)
      setInscriptos(data ?? [])
    } catch { setInscriptos([]) }
    finally { setCargandoModal(false) }
  }

  async function quitarInscripto(torneoId, socioId, nombre) {
    if (!window.confirm(`¿Quitar a ${nombre} del torneo?`)) return
    setQuitando(socioId)
    try {
      await quitarInscriptoTorneo(torneoId, socioId)
      setInscriptos(prev => prev.filter(i => i.id !== socioId && i.nombre !== nombre))
      // Refrescar conteo en la lista de publicados
      setPublicados(prev => prev.map(p =>
        p.id === torneoId ? { ...p, inscriptos: Math.max(0, (p.inscriptos ?? 1) - 1) } : p
      ))
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo quitar al inscripto')
    } finally {
      setQuitando(null)
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

  return (
    <div className="admin-page">
      <div className="admin-header">
        <button className="btn-volver-admin" onClick={() => navigate('/admin')}>‹ Inicio</button>
        <h1>Crear torneo</h1>
        <p>Torneo interno del club</p>
      </div>

      <div className="admin-body">
        {exito && <div className="alerta-exito">✓ Torneo publicado correctamente</div>}
        {error && <div className="alerta-error">{error}</div>}

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre del torneo</label>
            <input name="nombre" type="text" className="form-input"
              placeholder="ej. Copa de Verano 2026"
              value={form.nombre} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Sede</label>
            <select name="sede_id" className="form-select" value={form.sede_id} onChange={handleChange}>
              <option value="">Seleccioná una sede</option>
              {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
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
            <label>Modalidad</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['singles', 'dobles'].map(m => (
                <button
                  key={m}
                  type="button"
                  className={`filtro-pill${form.modalidad === m ? ' activo' : ''}`}
                  onClick={() => setForm(prev => ({ ...prev, modalidad: m }))}
                  style={{ flex: 1, textTransform: 'capitalize' }}
                >
                  {m === 'singles' ? '🧍 Singles' : '👥 Dobles'}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Capacidad máxima ({form.modalidad === 'dobles' ? 'parejas' : 'jugadores'})</label>
            <input name="capacidad_maxima" type="number" min="2" max="64" className="form-input"
              value={form.capacidad_maxima} onChange={handleChange} />
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
            {enviando ? 'Publicando...' : 'Publicar torneo'}
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
                  const abierto = modalId === p.id
                  return (
                    <div key={p.id}>
                      <div className="juego-libre-item">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="juego-libre-fecha">
                            🏆 {p.nombre}
                            <span style={{ marginLeft: 6, fontSize: 11, background: '#eef2ff', color: '#4f46e5', padding: '2px 7px', borderRadius: 999, fontWeight: 700 }}>
                              {p.modalidad}
                            </span>
                          </p>
                          <p className="juego-libre-sub">
                            {formatFechaHora(p.fecha_inicio)} · {p.sedes?.nombre ?? 'Sede'}
                          </p>
                          <p className="juego-libre-sub">
                            {p.inscriptos ?? 0}/{p.capacidad_maxima} inscriptos
                          </p>
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

                      {abierto && (
                        <div className="inscriptos-panel">
                          {cargandoModal ? (
                            <div style={{ textAlign: 'center', padding: '16px 0' }}>
                              <div className="spinner-admin" style={{ margin: '0 auto 8px' }} />
                            </div>
                          ) : inscriptos.length === 0 ? (
                            <p className="inscriptos-vacio">Nadie se anotó todavía.</p>
                          ) : (
                            <>
                              <p className="inscriptos-titulo">{inscriptos.length} inscripto{inscriptos.length !== 1 ? 's' : ''}</p>
                              {inscriptos.map((insc, idx) => (
                                <div key={insc.id} className="inscripto-row">
                                  <div className="inscripto-num">{idx + 1}</div>
                                  <div className="inscripto-info" style={{ flex: 1 }}>
                                    <span className="inscripto-nombre">{insc.nombre}</span>
                                    <span className="inscripto-email">{insc.email}</span>
                                    {insc.telefono && <span className="inscripto-email">{insc.telefono}</span>}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                    <span className="badge-nivel" style={NIVEL_STYLE[insc.nivel] ?? { background: '#f3f4f6', color: '#6b7280' }}>
                                      {insc.nivel}
                                    </span>
                                    <span style={{ fontSize: 10, color: '#9ca3af' }}>{formatFechaInsc(insc.fecha_inscripcion)}</span>
                                    <button
                                      className="btn-danger"
                                      style={{ padding: '3px 10px', fontSize: 11, marginTop: 2 }}
                                      disabled={quitando === insc.socio_id}
                                      onClick={() => quitarInscripto(p.id, insc.socio_id, insc.nombre)}
                                    >
                                      {quitando === insc.socio_id ? '...' : 'Quitar'}
                                    </button>
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
