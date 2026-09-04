import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav/AdminBottomNav'
import {
  getSocio,
  editarSocio,
  getNiveles,
  getTurnosDisponibles,
  asignarTurnoSocio,
  quitarTurnoSocio,
} from '../../services/adminApi'
import './Admin.css'

const TZ = 'America/Argentina/Buenos_Aires'

function formatFechaTurno(iso) {
  const d = new Date(iso)
  const fecha = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short', timeZone: TZ })
  const hora  = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  return `${fecha.charAt(0).toUpperCase()}${fecha.slice(1)} · ${hora} hs`
}

function formatTurnoOpcion(t) {
  const tipo = t.tipo_turno_id === 2 ? 'Clase particular' : 'Entrenamiento'
  const d    = new Date(t.fecha_inicio)
  const fecha = d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: TZ })
  const hora  = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  return `${tipo} · ${fecha} ${hora} · ${t.sede} · ${t.entrenador} (${t.cupo_disponible} cupo${t.cupo_disponible !== 1 ? 's' : ''})`
}

export default function DetalleSocio() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [socio,      setSocio]      = useState(null)
  const [turnos,     setTurnos]     = useState([])
  const [niveles,    setNiveles]    = useState([])
  const [turnosDisp, setTurnosDisp] = useState([])
  const [turnoSelec, setTurnoSelec] = useState('')
  const [cargando,   setCargando]   = useState(true)
  const [guardando,  setGuardando]  = useState(false)
  const [asignando,  setAsignando]  = useState(false)
  const [quitando,   setQuitando]   = useState(null)
  const [exito,      setExito]      = useState('')
  const [error,      setError]      = useState('')
  const [nivelId,    setNivelId]    = useState('')
  const [cuota,      setCuota]      = useState(true)

  useEffect(() => {
    Promise.all([getSocio(id), getNiveles(), getTurnosDisponibles()])
      .then(([{ usuario, turnos: t }, nivData, turnosData]) => {
        setSocio(usuario)
        setTurnos(t ?? [])
        setNiveles(nivData)
        setTurnosDisp(turnosData ?? [])
        setNivelId(usuario.nivel_id ?? '')
        setCuota(usuario.cuota_al_dia ?? true)
      })
      .catch(err => setError(err.response?.data?.error || 'Error al cargar socio'))
      .finally(() => setCargando(false))
  }, [id])

  async function guardar() {
    setGuardando(true)
    setExito('')
    setError('')
    try {
      await editarSocio(id, { nivel_id: nivelId || null, cuota_al_dia: cuota })
      setExito('Cambios guardados correctamente')
      setTimeout(() => setExito(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function handleAsignar() {
    if (!turnoSelec) return
    setAsignando(true)
    setError('')
    try {
      const { data } = await asignarTurnoSocio(id, { turno_id: turnoSelec })
      setTurnos(prev => [data, ...prev])
      setTurnoSelec('')
      const nuevosDisp = await getTurnosDisponibles()
      setTurnosDisp(nuevosDisp ?? [])
      setExito('Turno asignado correctamente')
      setTimeout(() => setExito(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al asignar turno')
    } finally {
      setAsignando(false)
    }
  }

  async function handleQuitar(socioTurnoId) {
    setQuitando(socioTurnoId)
    setError('')
    try {
      await quitarTurnoSocio(id, socioTurnoId)
      setTurnos(prev => prev.filter(t => t.id !== socioTurnoId))
      const nuevosDisp = await getTurnosDisponibles()
      setTurnosDisp(nuevosDisp ?? [])
    } catch (err) {
      setError(err.response?.data?.error || 'Error al quitar turno')
    } finally {
      setQuitando(null)
    }
  }

  if (cargando) {
    return (
      <div className="admin-page">
        <div className="admin-header">
          <button className="btn-volver-admin" onClick={() => navigate('/admin/socios')}>‹ Socios</button>
          <h1>Cargando...</h1>
        </div>
        <div className="admin-body">
          <div className="estado-carga"><div className="spinner-admin" /></div>
        </div>
        <AdminBottomNav />
      </div>
    )
  }

  const iniciales   = socio?.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
  const nivelActual = niveles.find(n => n.id === socio?.nivel_id)

  return (
    <div className="admin-page">
      <div className="admin-header">
        <button className="btn-volver-admin" onClick={() => navigate('/admin/socios')}>‹ Socios</button>
        <h1>{socio?.nombre ?? 'Socio'}</h1>
        <p>Editar socio</p>
      </div>

      <div className="admin-body">
        {/* Perfil */}
        <div className="admin-card admin-card-body" style={{ textAlign: 'center' }}>
          <div className="config-avatar" style={{ margin: '0 auto 10px' }}>{iniciales}</div>
          <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--admin-text)', marginBottom: 2 }}>
            {socio?.nombre}
          </div>
          <div style={{ fontSize: 13, color: 'var(--admin-muted)', marginBottom: 4 }}>
            {socio?.email}{socio?.telefono ? ` · ${socio.telefono}` : ''}
          </div>
          {nivelActual && (
            <span className={`badge-nivel ${nivelActual.nombre.toLowerCase()}`}>
              {nivelActual.nombre}
            </span>
          )}
        </div>

        {exito && <div className="alerta-exito">✓ {exito}</div>}
        {error && <div className="alerta-error">{error}</div>}

        {/* Cambiar nivel */}
        <div className="admin-card admin-card-body">
          <p className="admin-label" style={{ marginBottom: 10 }}>Nivel</p>
          <div className="nivel-selector" style={{ flexWrap: 'wrap' }}>
            {niveles.map(n => (
              <button
                key={n.id}
                className={`nivel-btn ${n.nombre.toLowerCase()} ${nivelId === n.id ? 'sel' : ''}`}
                onClick={() => setNivelId(nivelId === n.id ? '' : n.id)}
              >
                {n.nombre}
              </button>
            ))}
          </div>
        </div>

        {/* Estado de pago */}
        <div className="admin-card admin-card-body">
          <p className="admin-label" style={{ marginBottom: 10 }}>Estado de pago</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`filtro-pill ${cuota ? 'activo' : ''}`}
              onClick={() => setCuota(true)}
            >
              Al día ✓
            </button>
            <button
              className="filtro-pill"
              style={!cuota ? { background: '#ef4444', borderColor: '#ef4444', color: 'white' } : {}}
              onClick={() => setCuota(false)}
            >
              Con deuda
            </button>
          </div>
        </div>

        <button className="btn-primary" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>

        {/* ── Bonos ── */}
        <button
          className="btn-secondary"
          style={{ width: '100%', padding: '12px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          onClick={() => navigate(`/admin/bonos/${id}`)}
        >
          🎟️ Gestionar bonos
        </button>

        {/* ── Asignar turno ── */}
        <div className="admin-card admin-card-body">
          <p className="admin-label" style={{ marginBottom: 10 }}>Asignar turno</p>
          {turnosDisp.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--admin-muted)' }}>
              No hay turnos con cupo disponible próximamente.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <select
                className="form-select"
                value={turnoSelec}
                onChange={e => setTurnoSelec(e.target.value)}
              >
                <option value="">Seleccioná un turno...</option>
                {turnosDisp.map(t => (
                  <option key={t.id} value={t.id}>
                    {formatTurnoOpcion(t)}
                  </option>
                ))}
              </select>
              <button
                className="btn-primary"
                onClick={handleAsignar}
                disabled={!turnoSelec || asignando}
              >
                {asignando ? 'Asignando...' : 'Asignar turno'}
              </button>
            </div>
          )}
        </div>

        {/* ── Turnos asignados ── */}
        <div className="admin-card admin-card-body">
          <p className="admin-label" style={{ marginBottom: 10 }}>
            Turnos asignados ({turnos.length})
          </p>
          {turnos.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--admin-muted)' }}>
              Este socio no tiene turnos asignados.
            </p>
          ) : (
            turnos.map(t => {
              const fechaTurno = t.turnos?.fecha_inicio
              const esQuitando = quitando === t.id
              return (
                <div
                  key={t.id}
                  style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: 8,
                    padding: '10px 0', borderBottom: '1px solid var(--admin-border)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--admin-text)' }}>
                      {fechaTurno ? formatFechaTurno(fechaTurno) : 'Sin fecha'}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--admin-muted)' }}>
                      {t.turnos?.sedes?.nombre ?? ''}
                      {t.turnos?.mesas?.numero ? ` · Mesa ${t.turnos.mesas.numero}` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span className={`badge-cuota ${t.estado ? 'al-dia' : 'deuda'}`}>
                      {t.estado ? 'Confirmado' : 'Pendiente'}
                    </span>
                    <button
                      className="btn-danger"
                      style={{ padding: '5px 10px', fontSize: 12 }}
                      onClick={() => handleQuitar(t.id)}
                      disabled={esQuitando}
                      aria-label="Quitar turno"
                    >
                      {esQuitando ? '...' : '✕'}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <AdminBottomNav />
    </div>
  )
}
