/**
 * AdminTurnos.jsx — Gestión de turnos de entrenamiento recurrentes.
 * Permite crear, editar, asignar socios, reasignar entrenador,
 * cancelar solo la próxima semana o dar de baja definitivamente.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav/AdminBottomNav'
import {
  getPlantillasTurnos, getDetalleTurnoAdmin, crearTurnoAdmin, editarTurnoAdmin,
  bajaTurnoDefinitiva, cancelarSemana, asignarSocioTurno, quitarSocioTurno,
  reasignarEntrenador,
  getEntrenadores, getSedes, getNiveles, getSocios,
} from '../../services/adminApi'
import './Admin.css'

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function labelTurno(t) {
  const dia  = DIAS[t.dia_semana] ?? `Día ${t.dia_semana}`
  const hora = t.hora_inicio?.slice(0, 5) ?? '?'
  const sede = t.sedes?.nombre ?? '?'
  const ent  = t.users?.nombre ?? '?'
  return `${dia} ${hora} hs · ${sede} · ${ent}`
}

// ── Formulario para crear/editar turno ───────────────────────────────────────
function FormTurno({ inicial, entrenadores, sedes, niveles, onGuardar, onCancelar, guardando }) {
  const [form, setForm] = useState({
    sede_id: '', entrenador_id: '',
    dia_semana: '1', hora_inicio: '', hora_fin: '',
    duracion_min: '', capacidad_maxima: '6',
    nivel_minimo_id: '', nivel_maximo_id: '',
    recurrente: true,
    ...inicial,
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  function handleSubmit(e) {
    e.preventDefault()
    onGuardar({
      sede_id:          Number(form.sede_id),
      entrenador_id:    Number(form.entrenador_id),
      dia_semana:       Number(form.dia_semana),
      hora_inicio:      form.hora_inicio,
      hora_fin:         form.hora_fin,
      duracion_min:     form.duracion_min ? Number(form.duracion_min) : null,
      capacidad_maxima: Number(form.capacidad_maxima),
      nivel_minimo_id:  form.nivel_minimo_id ? Number(form.nivel_minimo_id) : null,
      nivel_maximo_id:  form.nivel_maximo_id ? Number(form.nivel_maximo_id) : null,
      recurrente:       form.recurrente,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form">
      <div className="form-group">
        <label>Sede *</label>
        <select className="form-select" value={form.sede_id} onChange={e => set('sede_id', e.target.value)} required>
          <option value="">Seleccioná una sede...</option>
          {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>Entrenador *</label>
        <select className="form-select" value={form.entrenador_id} onChange={e => set('entrenador_id', e.target.value)} required>
          <option value="">Seleccioná un entrenador...</option>
          {entrenadores.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group">
          <label>Día de la semana *</label>
          <select className="form-select" value={form.dia_semana} onChange={e => set('dia_semana', e.target.value)} required>
            {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Capacidad máx. *</label>
          <input type="number" min="1" max="30" className="form-input" value={form.capacidad_maxima}
            onChange={e => set('capacidad_maxima', e.target.value)} required />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group">
          <label>Hora inicio *</label>
          <input type="time" className="form-input" value={form.hora_inicio}
            onChange={e => set('hora_inicio', e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Hora fin *</label>
          <input type="time" className="form-input" value={form.hora_fin}
            onChange={e => set('hora_fin', e.target.value)} required />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group">
          <label>Nivel mínimo</label>
          <select className="form-select" value={form.nivel_minimo_id} onChange={e => set('nivel_minimo_id', e.target.value)}>
            <option value="">Sin límite</option>
            {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Nivel máximo</label>
          <select className="form-select" value={form.nivel_maximo_id} onChange={e => set('nivel_maximo_id', e.target.value)}>
            <option value="">Sin límite</option>
            {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="btn-secondary" onClick={onCancelar} style={{ flex: 1 }}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={guardando} style={{ flex: 1 }}>
          {guardando ? 'Guardando...' : 'Guardar turno'}
        </button>
      </div>
    </form>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function AdminTurnos() {
  const navigate = useNavigate()

  // Datos globales
  const [turnos,       setTurnos]       = useState([])
  const [entrenadores, setEntrenadores] = useState([])
  const [sedes,        setSedes]        = useState([])
  const [niveles,      setNiveles]      = useState([])
  const [socios,       setSocios]       = useState([])
  const [cargando,     setCargando]     = useState(true)

  // UI state
  const [vistaDetalle,  setVistaDetalle]  = useState(null)  // turno seleccionado para detalle
  const [detalle,       setDetalle]       = useState(null)  // datos completos del turno
  const [cargandoDet,   setCargandoDet]   = useState(false)
  const [mostrarForm,   setMostrarForm]   = useState(false) // form crear
  const [editando,      setEditando]      = useState(false) // form editar
  const [guardando,     setGuardando]     = useState(false)
  const [error,         setError]         = useState('')
  const [exito,         setExito]         = useState('')

  // Modales de confirmación
  const [confirmarBaja,   setConfirmarBaja]   = useState(false)
  const [confirmarSemana, setConfirmarSemana] = useState(false)
  const [motivoSemana,    setMotivoSemana]    = useState('')

  // Reasignar entrenador
  const [nuevoEntId, setNuevoEntId] = useState('')

  // Asignar socio
  const [socioAsignar, setSocioAsignar] = useState('')
  const [asignando,    setAsignando]    = useState(false)

  function mostrarExito(msg) {
    setExito(msg); setError('')
    setTimeout(() => setExito(''), 4000)
  }

  const cargarTurnos = useCallback(async () => {
    setCargando(true)
    try {
      const [t, e, s, n, so] = await Promise.all([
        getPlantillasTurnos(),
        getEntrenadores(),
        getSedes(),
        getNiveles(),
        getSocios(),
      ])
      setTurnos(t ?? [])
      setEntrenadores(e ?? [])
      setSedes(s ?? [])
      setNiveles(n ?? [])
      setSocios(so ?? [])
    } catch (err) {
      setError('Error al cargar datos')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargarTurnos() }, [cargarTurnos])

  async function abrirDetalle(id) {
    setVistaDetalle(id)
    setEditando(false)
    setCargandoDet(true)
    setError('')
    try {
      const data = await getDetalleTurnoAdmin(id)
      setDetalle(data)
      setNuevoEntId(String(data.users?.id ?? ''))
    } catch { setError('Error al cargar detalle del turno') }
    finally { setCargandoDet(false) }
  }

  async function handleCrear(body) {
    setGuardando(true); setError('')
    try {
      await crearTurnoAdmin(body)
      mostrarExito('Turno creado correctamente')
      setMostrarForm(false)
      await cargarTurnos()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear turno')
    } finally { setGuardando(false) }
  }

  async function handleEditar(body) {
    setGuardando(true); setError('')
    try {
      await editarTurnoAdmin(vistaDetalle, body)
      mostrarExito('Turno actualizado correctamente')
      setEditando(false)
      await abrirDetalle(vistaDetalle)
      await cargarTurnos()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar turno')
    } finally { setGuardando(false) }
  }

  async function handleBajaDefinitiva() {
    setGuardando(true); setError('')
    try {
      await bajaTurnoDefinitiva(vistaDetalle)
      mostrarExito('Turno dado de baja definitivamente')
      setConfirmarBaja(false)
      setVistaDetalle(null)
      setDetalle(null)
      await cargarTurnos()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al dar de baja')
    } finally { setGuardando(false) }
  }

  async function handleCancelarSemana() {
    setGuardando(true); setError('')
    try {
      const res = await cancelarSemana(vistaDetalle, { motivo: motivoSemana || undefined })
      mostrarExito(res.mensaje)
      setConfirmarSemana(false)
      setMotivoSemana('')
      await abrirDetalle(vistaDetalle)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cancelar la semana')
    } finally { setGuardando(false) }
  }

  async function handleReasignar() {
    if (!nuevoEntId) return
    setGuardando(true); setError('')
    try {
      const res = await reasignarEntrenador(vistaDetalle, { entrenador_id: Number(nuevoEntId) })
      mostrarExito(res.mensaje)
      await abrirDetalle(vistaDetalle)
      await cargarTurnos()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al reasignar entrenador')
    } finally { setGuardando(false) }
  }

  async function handleAsignarSocio() {
    if (!socioAsignar) return
    setAsignando(true); setError('')
    try {
      await asignarSocioTurno(vistaDetalle, { socio_id: Number(socioAsignar) })
      mostrarExito('Socio asignado correctamente')
      setSocioAsignar('')
      await abrirDetalle(vistaDetalle)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al asignar socio')
    } finally { setAsignando(false) }
  }

  async function handleQuitarSocio(socioId) {
    setError('')
    try {
      await quitarSocioTurno(vistaDetalle, socioId)
      mostrarExito('Socio quitado del turno')
      await abrirDetalle(vistaDetalle)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al quitar socio')
    }
  }

  // ── Vista detalle de un turno ─────────────────────────────────────────────
  if (vistaDetalle) {
    if (cargandoDet || !detalle) {
      return (
        <div className="admin-page">
          <div className="admin-header">
            <button className="btn-volver-admin" onClick={() => { setVistaDetalle(null); setDetalle(null) }}>‹ Turnos</button>
            <h1>Detalle de turno</h1>
          </div>
          <div className="admin-body"><div className="estado-carga"><div className="spinner-admin" /></div></div>
          <AdminBottomNav />
        </div>
      )
    }

    const inscriptosActivos = (detalle.socio_turno ?? []).filter(s => s.estado === true)
    const dia  = DIAS[detalle.dia_semana] ?? ''
    const hora = detalle.hora_inicio?.slice(0, 5) ?? ''
    const horFin = detalle.hora_fin?.slice(0, 5) ?? ''

    return (
      <div className="admin-page">
        <div className="admin-header">
          <button className="btn-volver-admin" onClick={() => { setVistaDetalle(null); setDetalle(null) }}>‹ Turnos</button>
          <h1>{dia} {hora} hs</h1>
          <p>{detalle.sedes?.nombre ?? ''} · {detalle.users?.nombre ?? ''}</p>
        </div>

        <div className="admin-body">
          {exito && <div className="alerta-exito">✓ {exito}</div>}
          {error && <div className="alerta-error">{error}</div>}

          {/* Info básica */}
          <div className="admin-card admin-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
              <div><span style={{ color: 'var(--admin-muted)', fontSize: 11 }}>DÍA</span><br /><strong>{dia}</strong></div>
              <div><span style={{ color: 'var(--admin-muted)', fontSize: 11 }}>HORARIO</span><br /><strong>{hora} – {horFin} hs</strong></div>
              <div><span style={{ color: 'var(--admin-muted)', fontSize: 11 }}>SEDE</span><br /><strong>{detalle.sedes?.nombre ?? '—'}</strong></div>
              <div><span style={{ color: 'var(--admin-muted)', fontSize: 11 }}>ENTRENADOR</span><br /><strong>{detalle.users?.nombre ?? '—'}</strong></div>
              <div><span style={{ color: 'var(--admin-muted)', fontSize: 11 }}>CUPO</span><br /><strong>{inscriptosActivos.length} / {detalle.capacidad_maxima}</strong></div>
              <div><span style={{ color: 'var(--admin-muted)', fontSize: 11 }}>NIVEL</span><br /><strong>{detalle.niveles_min?.nombre ?? '—'} → {detalle.niveles_max?.nombre ?? '—'}</strong></div>
            </div>
            <button className="btn-secondary" style={{ marginTop: 14 }} onClick={() => setEditando(e => !e)}>
              {editando ? 'Cancelar edición' : '✏️ Editar datos del turno'}
            </button>
          </div>

          {editando && (
            <div className="admin-card admin-card-body">
              <p className="admin-label" style={{ marginBottom: 10 }}>Editar turno</p>
              <FormTurno
                inicial={{
                  sede_id: String(detalle.sede_id ?? ''),
                  entrenador_id: String(detalle.users?.id ?? ''),
                  dia_semana: String(detalle.dia_semana ?? '1'),
                  hora_inicio: detalle.hora_inicio?.slice(0,5) ?? '',
                  hora_fin:    detalle.hora_fin?.slice(0,5) ?? '',
                  duracion_min: String(detalle.duracion_min ?? ''),
                  capacidad_maxima: String(detalle.capacidad_maxima ?? '6'),
                  nivel_minimo_id: String(detalle.nivel_minimo_id ?? ''),
                  nivel_maximo_id: String(detalle.nivel_maximo_id ?? ''),
                  recurrente: detalle.recurrente ?? true,
                }}
                entrenadores={entrenadores} sedes={sedes} niveles={niveles}
                onGuardar={handleEditar} onCancelar={() => setEditando(false)} guardando={guardando}
              />
            </div>
          )}

          {/* Reasignar entrenador */}
          <div className="admin-card admin-card-body">
            <p className="admin-label" style={{ marginBottom: 10 }}>Reasignar entrenador</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <select className="form-select" value={nuevoEntId} onChange={e => setNuevoEntId(e.target.value)} style={{ flex: 1 }}>
                <option value="">Seleccioná entrenador...</option>
                {entrenadores.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
              <button className="btn-primary" style={{ width: 'auto', padding: '11px 16px' }}
                onClick={handleReasignar} disabled={guardando || !nuevoEntId}>
                {guardando ? '...' : 'Reasignar'}
              </button>
            </div>
          </div>

          {/* Inscriptos */}
          <div className="admin-card">
            <div className="admin-card-body" style={{ borderBottom: '1px solid var(--admin-border)' }}>
              <p className="admin-label" style={{ marginBottom: 8 }}>
                Inscriptos ({inscriptosActivos.length}/{detalle.capacidad_maxima})
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <select className="form-select" value={socioAsignar} onChange={e => setSocioAsignar(e.target.value)} style={{ flex: 1 }}>
                  <option value="">Agregar socio...</option>
                  {socios.filter(s => !inscriptosActivos.some(i => i.users?.id === s.id)).map(s =>
                    <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
                <button className="btn-primary" style={{ width: 'auto', padding: '11px 14px' }}
                  onClick={handleAsignarSocio} disabled={asignando || !socioAsignar}>
                  {asignando ? '...' : 'Agregar'}
                </button>
              </div>
            </div>
            {inscriptosActivos.length === 0 ? (
              <div className="estado-vacio" style={{ padding: '24px 16px' }}>Sin inscriptos todavía.</div>
            ) : (
              inscriptosActivos.map((s, idx) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderBottom: '1px solid var(--admin-border)' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--admin-primary-l)', color: 'var(--admin-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{s.users?.nombre ?? '—'}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--admin-muted)' }}>{s.users?.niveles?.nombre ?? 'Sin nivel'}</p>
                  </div>
                  <button className="btn-danger" style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => handleQuitarSocio(s.users?.id)}>✕</button>
                </div>
              ))
            )}
          </div>

          {/* Excepciones existentes */}
          {(detalle.turno_excepciones ?? []).length > 0 && (
            <div className="admin-card admin-card-body">
              <p className="admin-label" style={{ marginBottom: 8 }}>Semanas canceladas</p>
              {detalle.turno_excepciones.map(ex => (
                <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--admin-border)', fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{ex.fecha_excepcion}</span>
                  <span style={{ color: 'var(--admin-muted)', fontSize: 12 }}>{ex.motivo ?? 'Sin motivo'}</span>
                </div>
              ))}
            </div>
          )}

          {/* Acciones críticas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => setConfirmarSemana(true)}
              style={{ width: '100%', padding: 14, background: '#fff8e1', color: '#d97706', border: '2px solid #f59e0b', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              📅 Cancelar solo la próxima semana
            </button>
            <button
              onClick={() => setConfirmarBaja(true)}
              style={{ width: '100%', padding: 14, background: '#fef2f2', color: '#ef4444', border: '2px solid #fca5a5', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              🗑️ Dar de baja definitivamente
            </button>
          </div>
        </div>

        {/* Modal: cancelar solo próxima semana */}
        {confirmarSemana && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-end', zIndex: 300 }}>
            <div style={{ background: 'white', width: '100%', borderRadius: '20px 20px 0 0', padding: '28px 20px 36px' }}>
              <h3 style={{ margin: '0 0 8px', color: '#d97706' }}>📅 Cancelar próxima semana</h3>
              <p style={{ margin: '0 0 16px', fontSize: 14, color: '#555' }}>
                Esto cancela <strong>solo la instancia del próximo {DIAS[detalle.dia_semana]}</strong>. El turno recurrente sigue activo y se retoma la semana siguiente.
              </p>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Motivo (opcional)</label>
                <input className="form-input" placeholder="Ej: Feriado, entrenador ausente..." value={motivoSemana} onChange={e => setMotivoSemana(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setConfirmarSemana(false); setMotivoSemana('') }}>Cancelar</button>
                <button onClick={handleCancelarSemana} disabled={guardando}
                  style={{ flex: 1, padding: 14, background: '#f59e0b', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {guardando ? '...' : 'Confirmar cancelación'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: baja definitiva */}
        {confirmarBaja && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-end', zIndex: 300 }}>
            <div style={{ background: 'white', width: '100%', borderRadius: '20px 20px 0 0', padding: '28px 20px 36px' }}>
              <h3 style={{ margin: '0 0 8px', color: '#ef4444' }}>🗑️ Baja definitiva</h3>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: '#555' }}>
                Esto <strong>desactiva el turno para siempre</strong>. No se generarán más instancias futuras. Esta acción no se puede deshacer desde la app.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmarBaja(false)}>Cancelar</button>
                <button onClick={handleBajaDefinitiva} disabled={guardando}
                  style={{ flex: 1, padding: 14, background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {guardando ? '...' : 'Dar de baja definitivamente'}
                </button>
              </div>
            </div>
          </div>
        )}

        <AdminBottomNav />
      </div>
    )
  }

  // ── Vista lista de plantillas ─────────────────────────────────────────────
  return (
    <div className="admin-page">
      <div className="admin-header">
        <button className="btn-volver-admin" onClick={() => navigate('/admin/actividades')}>‹ Actividades</button>
        <h1>Turnos de entrenamiento</h1>
        <p>Plantillas semanales recurrentes</p>
      </div>

      <div className="admin-body">
        {exito && <div className="alerta-exito">✓ {exito}</div>}
        {error && <div className="alerta-error">{error}</div>}

        {!mostrarForm && (
          <button className="btn-primary" onClick={() => setMostrarForm(true)}>
            + Nuevo turno recurrente
          </button>
        )}

        {mostrarForm && (
          <div className="admin-card admin-card-body">
            <p className="admin-label" style={{ marginBottom: 10 }}>Nuevo turno recurrente</p>
            <FormTurno
              inicial={{}}
              entrenadores={entrenadores} sedes={sedes} niveles={niveles}
              onGuardar={handleCrear} onCancelar={() => setMostrarForm(false)} guardando={guardando}
            />
          </div>
        )}

        {cargando ? (
          <div className="estado-carga"><div className="spinner-admin" /></div>
        ) : turnos.length === 0 ? (
          <div className="estado-vacio">No hay turnos recurrentes creados todavía.</div>
        ) : (
          // Agrupar por día de la semana
          [0,1,2,3,4,5,6].map(dia => {
            const delDia = turnos.filter(t => t.dia_semana === dia)
            if (!delDia.length) return null
            return (
              <div key={dia}>
                <p className="admin-label">{DIAS[dia]}</p>
                {delDia.map(t => {
                  const insc = t.inscriptos ?? 0
                  const cap  = t.capacidad_maxima ?? 0
                  const pct  = cap > 0 ? Math.min((insc / cap) * 100, 100) : 0
                  const lleno = insc >= cap
                  return (
                    <div
                      key={t.id}
                      className="admin-card"
                      style={{ cursor: 'pointer', marginBottom: 10 }}
                      onClick={() => abrirDetalle(t.id)}
                    >
                      <div style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 15, color: 'var(--admin-text)' }}>
                              {t.hora_inicio?.slice(0,5)} – {t.hora_fin?.slice(0,5)} hs
                            </p>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--admin-muted)' }}>
                              {t.sedes?.nombre ?? '—'} · {t.users?.nombre ?? '—'}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            {lleno && (
                              <span style={{ fontSize: 10, fontWeight: 700, background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: 999 }}>
                                Lleno
                              </span>
                            )}
                            <span style={{ fontSize: 10, fontWeight: 700, background: '#eef2ff', color: '#4f46e5', padding: '2px 8px', borderRadius: 999 }}>
                              {insc}/{cap}
                            </span>
                          </div>
                        </div>
                        <div style={{ height: 4, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: lleno ? '#ef4444' : '#4f46e5', borderRadius: 999 }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
      </div>

      <AdminBottomNav />
    </div>
  )
}
