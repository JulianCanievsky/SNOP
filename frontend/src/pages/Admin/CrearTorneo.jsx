import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppNav from '../../components/AppNav/AppNav'
import { getSedes, getNiveles } from '../../services/adminApi'
import { obtenerMensajeError } from '../../lib/errores.js'
import { crearTorneo, getTorneosAdmin, borrarTorneo, getInscriptosTorneo, quitarInscriptoTorneo } from '../../services/torneosApi'
import { ToastContainer } from '../../components/ui/Toast'
import { useToast } from '../../hooks/useToast'
import CategoriaBadge from '../../components/ui/CategoriaBadge/CategoriaBadge'
import ConfirmDialog from '../../components/ui/ConfirmDialog/ConfirmDialog'
import './Admin.css'
import Spinner from '../../components/ui/Spinner/Spinner'

const TZ = 'America/Argentina/Buenos_Aires'

export default function CrearTorneo() {
  const navigate = useNavigate()
  const { toasts, showToast, removeToast } = useToast()

  const [sedes,      setSedes]      = useState([])
  const [niveles,    setNiveles]    = useState([])
  const [publicados, setPublicados] = useState([])
  const [cargando,   setCargando]   = useState(true)
  const [enviando,   setEnviando]   = useState(false)
  const [exito,      setExito]      = useState(false)
  const [error,      setError]      = useState('')

  // Modal inscriptos
  const [modalId,        setModalId]        = useState(null)
  const [inscriptos,     setInscriptos]      = useState([])
  const [cargandoModal,  setCargandoModal]  = useState(false)
  const [quitando,       setQuitando]       = useState(null)
  const [confirmarEliminar, setConfirmarEliminar] = useState(null)
  const [confirmarQuitarInsc, setConfirmarQuitarInsc] = useState(null) // { torneoId, socioId, nombre }

  const [form, setForm] = useState({
    nombre:              '',
    sede_id:             '',
    fecha:               '',
    hora_inicio:         '09:00',
    hora_fin:            '13:00',
    modalidad:           'singles',
    capacidad_maxima:    16,
    niveles_habilitados: [], // array de IDs (int), vacío = apto para todos
  })

  useEffect(() => {
    Promise.all([getSedes(), getTorneosAdmin(), getNiveles()])
      .then(([s, p, n]) => { setSedes(s); setPublicados(p); setNiveles(n ?? []) })
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

  function toggleNivel(nivelId) {
    setForm(prev => {
      const ya = prev.niveles_habilitados.includes(nivelId)
      return {
        ...prev,
        niveles_habilitados: ya
          ? prev.niveles_habilitados.filter(id => id !== nivelId)
          : [...prev.niveles_habilitados, nivelId],
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
      setForm(prev => ({ ...prev, nombre: '', fecha: '', sede_id: '', niveles_habilitados: [] }))
      setTimeout(() => setExito(false), 3000)
    } catch (err) {
      setError(obtenerMensajeError(err, 'Error al crear torneo'))
    } finally {
      setEnviando(false)
    }
  }

  async function eliminar(id) {
    setConfirmarEliminar(id)
  }

  async function handleConfirmarEliminar() {
    const id = confirmarEliminar
    setConfirmarEliminar(null)
    try {
      await borrarTorneo(id)
      setPublicados(prev => prev.filter(p => p.id !== id))
      if (modalId === id) setModalId(null)
    } catch (err) {
      showToast(obtenerMensajeError(err, 'Error al eliminar'), 'error')
    }
  }

  async function verInscriptos(id) {
    if (modalId === id) { setModalId(null); return }
    setModalId(id)
    setCargandoModal(true)
    try {
      const res = await getInscriptosTorneo(id)
      setInscriptos(res.data?.inscriptos ?? res.data ?? [])
    } catch { setInscriptos([]) }
    finally { setCargandoModal(false) }
  }

  async function quitarInscripto(torneoId, socioId, nombre) {
    setConfirmarQuitarInsc({ torneoId, socioId, nombre })
  }

  async function handleConfirmarQuitarInsc() {
    const { torneoId, socioId } = confirmarQuitarInsc
    setConfirmarQuitarInsc(null)
    setQuitando(socioId)
    try {
      await quitarInscriptoTorneo(torneoId, socioId)
      setInscriptos(prev => prev.filter(i => i.socio_id !== socioId))
      setPublicados(prev => prev.map(p =>
        p.id === torneoId ? { ...p, inscriptos: Math.max(0, (p.inscriptos ?? 1) - 1) } : p
      ))
    } catch (err) {
      showToast(obtenerMensajeError(err, 'No se pudo quitar al inscripto'), 'error')
    } finally {
      setQuitando(null)
    }
  }

  function formatFechaHora(iso) {
    const d   = new Date(iso)
    const dia  = d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: TZ })
    const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TZ })
    return `${dia} · ${hora} hs`
  }

  function formatFechaInsc(iso) {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: TZ })
  }

  const aptosParaTodos = form.niveles_habilitados.length === 0

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
            <input name="fecha" type="date" className="input-fecha"
              value={form.fecha} onChange={handleChange} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label>Inicio</label>
              <input name="hora_inicio" type="time" className="input-fecha"
                value={form.hora_inicio} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Fin</label>
              <input name="hora_fin" type="time" className="input-fecha"
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
            <label>Categorías habilitadas</label>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '4px 0 8px' }}>
              Sin selección = apto para todas las categorías
            </p>

            {/* Botón "Apto para todos" */}
            <label className="checkbox-nivel" style={{ marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={aptosParaTodos}
                onChange={() => setForm(prev => ({ ...prev, niveles_habilitados: [] }))}
              />
              <span style={{ fontSize: 13, fontWeight: 600 }}>✓ Apto para todos</span>
            </label>

            <div className="checkboxes-row" style={{ flexWrap: 'wrap', gap: 8 }}>
              {niveles.map(n => (
                <label key={n.id} className="checkbox-nivel" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={form.niveles_habilitados.includes(n.id)}
                    onChange={() => toggleNivel(n.id)}
                  />
                  <CategoriaBadge nivelId={n.id} />
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
                <Spinner center />
              ) : (
                publicados.map(p => {
                  const abierto = modalId === p.id
                  return (
                    <div key={p.id}>
                      <div className="juego-libre-item">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="juego-libre-fecha">
                            🏆 {p.nombre}
                            <span style={{ marginLeft: 6, fontSize: 11, background: 'var(--color-accent-subtle)', color: 'var(--color-accent)', padding: '2px 7px', borderRadius: 999, fontWeight: 700 }}>
                              {p.modalidad}
                            </span>
                          </p>
                          <p className="juego-libre-sub">
                            {formatFechaHora(p.fecha_inicio)} · {p.sedes?.nombre ?? 'Sede'}
                          </p>
                          <p className="juego-libre-sub">
                            {p.inscriptos ?? 0}/{p.capacidad_maxima} inscriptos
                          </p>
                          {Array.isArray(p.niveles_habilitados) && p.niveles_habilitados.length > 0 && (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                              {p.niveles_habilitados.map(id => (
                                <CategoriaBadge key={id} nivelId={id} />
                              ))}
                            </div>
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

                      {abierto && (
                        <div className="inscriptos-panel">
                          {cargandoModal ? (
                            <Spinner size="sm" center label="Cargando inscriptos" />
                          ) : inscriptos.length === 0 ? (
                            <p className="inscriptos-vacio">Nadie se anotó todavía.</p>
                          ) : (
                            <>
                              <p className="inscriptos-titulo">{inscriptos.length} inscripto{inscriptos.length !== 1 ? 's' : ''}</p>
                              {inscriptos.map((insc, idx) => (
                                <div key={insc.id ?? idx} className="inscripto-row">
                                  <div className="inscripto-num">{idx + 1}</div>
                                  <div className="inscripto-info" style={{ flex: 1 }}>
                                    <span className="inscripto-nombre">{insc.nombre}</span>
                                    <span className="inscripto-email">{insc.email}</span>
                                    {insc.telefono && <span className="inscripto-email">{insc.telefono}</span>}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                    <CategoriaBadge nivelId={insc.nivel_id ?? null} />
                                    <span style={{ fontSize: 10, color: 'var(--color-text-subtle)' }}>{formatFechaInsc(insc.fecha_inscripcion)}</span>
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

      <AppNav />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <ConfirmDialog
        open={confirmarEliminar !== null}
        title="Eliminar torneo"
        message="¿Borrar este torneo? Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        danger
        onConfirm={handleConfirmarEliminar}
        onCancel={() => setConfirmarEliminar(null)}
      />

      <ConfirmDialog
        open={confirmarQuitarInsc !== null}
        title="Quitar inscripto"
        message={confirmarQuitarInsc ? `¿Quitar a ${confirmarQuitarInsc.nombre} del torneo?` : ''}
        confirmLabel="Sí, quitar"
        cancelLabel="Cancelar"
        danger
        onConfirm={handleConfirmarQuitarInsc}
        onCancel={() => setConfirmarQuitarInsc(null)}
      />
    </div>
  )
}
