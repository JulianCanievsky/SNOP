import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav/AdminBottomNav'
import { getSocio, editarSocio, getEntrenadores } from '../../services/adminApi'
import './Admin.css'

const NIVELES = ['Rojo', 'Intermedio', 'Azul']

export default function DetalleSocio() {
  const { id }    = useParams()
  const navigate  = useNavigate()

  const [socio,        setSocio]        = useState(null)
  const [turnos,       setTurnos]       = useState([])
  const [entrenadores, setEntrenadores] = useState([])
  const [cargando,     setCargando]     = useState(true)
  const [guardando,    setGuardando]    = useState(false)
  const [exito,        setExito]        = useState(false)
  const [error,        setError]        = useState('')

  // Campos editables
  const [nivel,       setNivel]       = useState('')
  const [cuota,       setCuota]       = useState(true)
  const [entrenador,  setEntrenador]  = useState('')

  useEffect(() => {
    Promise.all([getSocio(id), getEntrenadores()])
      .then(([{ usuario, turnos: t }, entres]) => {
        setSocio(usuario)
        setTurnos(t)
        setEntrenadores(entres)
        setNivel(usuario.nivel ?? '')
        setCuota(usuario.cuota_al_dia ?? true)
        setEntrenador(usuario.entrenador_asignado_id ?? '')
      })
      .catch(err => setError(err.response?.data?.error || 'Error al cargar socio'))
      .finally(() => setCargando(false))
  }, [id])

  async function guardar() {
    setGuardando(true)
    setExito(false)
    setError('')
    try {
      await editarSocio(id, {
        nivel:                  nivel || null,
        cuota_al_dia:           cuota,
        entrenador_asignado_id: entrenador || null,
      })
      setExito(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="admin-page">
        <div className="admin-header">
          <button className="btn-volver-admin" onClick={() => navigate('/admin/socios')}>‹ Socios</button>
          <h1>Cargando...</h1>
        </div>
        <div className="admin-body"><div className="estado-carga"><div className="spinner-admin" /></div></div>
        <AdminBottomNav />
      </div>
    )
  }

  const iniciales = socio?.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'

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
          <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--admin-text)', marginBottom: 2 }}>{socio?.nombre}</div>
          <div style={{ fontSize: 13, color: 'var(--admin-muted)', marginBottom: 4 }}>{socio?.email} · {socio?.telefono ?? 'Sin tel.'}</div>
        </div>

        {exito && <div className="alerta-exito">✓ Cambios guardados correctamente</div>}
        {error && <div className="alerta-error">{error}</div>}

        {/* Cambiar nivel */}
        <div className="admin-card admin-card-body">
          <p className="admin-label" style={{ marginBottom: 10 }}>Nivel actual</p>
          <div className="nivel-selector">
            {NIVELES.map(n => (
              <button
                key={n}
                className={`nivel-btn ${n.toLowerCase()} ${nivel === n ? 'sel' : ''}`}
                onClick={() => setNivel(nivel === n ? '' : n)}
              >
                {n}
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
              className={`filtro-pill`}
              style={!cuota ? { background: '#ef4444', borderColor: '#ef4444', color: 'white' } : {}}
              onClick={() => setCuota(false)}
            >
              Con deuda
            </button>
          </div>
          {!cuota && (
            <button
              className="btn-secondary"
              style={{ marginTop: 12 }}
              onClick={() => alert('Recordatorio enviado (implementar push/email)')}
            >
              Enviar recordatorio de pago
            </button>
          )}
        </div>

        {/* Turno asignado */}
        {turnos.length > 0 && (
          <div className="admin-card admin-card-body">
            <p className="admin-label" style={{ marginBottom: 10 }}>Turno asignado</p>
            {turnos.slice(0, 1).map(t => {
              const fecha = t.turnos ? new Date(t.turnos.fecha_inicio) : null
              return (
                <div key={t.id} style={{ fontSize: 14, color: 'var(--admin-text)' }}>
                  {fecha
                    ? `${fecha.toLocaleDateString('es-AR', { weekday: 'long' })} — ${fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs`
                    : 'Sin fecha'}
                  {t.turnos?.sedes?.nombre && ` · Sede ${t.turnos.sedes.nombre}`}
                  {t.turnos?.mesas?.numero && ` · Mesa ${t.turnos.mesas.numero}`}
                </div>
              )
            })}
          </div>
        )}

        {/* Entrenador */}
        <div className="admin-card admin-card-body">
          <p className="admin-label" style={{ marginBottom: 10 }}>Entrenador asignado</p>
          <select
            className="form-select"
            value={entrenador}
            onChange={e => setEntrenador(e.target.value)}
          >
            <option value="">— Sin entrenador —</option>
            {entrenadores.map(e => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </div>

        <button className="btn-primary" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      <AdminBottomNav />
    </div>
  )
}
