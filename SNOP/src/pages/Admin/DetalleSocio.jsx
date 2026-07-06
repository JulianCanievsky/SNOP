import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav/AdminBottomNav'
import { getSocio, editarSocio, getEntrenadores, getNiveles } from '../../services/adminApi'
import './Admin.css'

export default function DetalleSocio() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [socio,        setSocio]        = useState(null)
  const [turnos,       setTurnos]       = useState([])
  const [niveles,      setNiveles]      = useState([])
  const [cargando,     setCargando]     = useState(true)
  const [guardando,    setGuardando]    = useState(false)
  const [exito,        setExito]        = useState(false)
  const [error,        setError]        = useState('')

  // Campos editables
  const [nivelId, setNivelId] = useState('')
  const [cuota,   setCuota]   = useState(true)

  useEffect(() => {
    Promise.all([getSocio(id), getNiveles()])
      .then(([{ usuario, turnos: t }, nivData]) => {
        setSocio(usuario)
        setTurnos(t)
        setNiveles(nivData)
        setNivelId(usuario.nivel_id ?? '')
        setCuota(usuario.cuota_al_dia ?? true)
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
        nivel_id:    nivelId || null,
        cuota_al_dia: cuota,
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
        <div className="admin-body">
          <div className="estado-carga"><div className="spinner-admin" /></div>
        </div>
        <AdminBottomNav />
      </div>
    )
  }

  const iniciales = socio?.nombre
    ?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'

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

        {exito && <div className="alerta-exito">✓ Cambios guardados correctamente</div>}
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

        {/* Turnos asignados */}
        {turnos.length > 0 && (
          <div className="admin-card admin-card-body">
            <p className="admin-label" style={{ marginBottom: 10 }}>Turnos asignados</p>
            {turnos.slice(0, 3).map(t => {
              const fecha = t.turnos ? new Date(t.turnos.fecha_inicio) : null
              return (
                <div key={t.id} style={{ fontSize: 14, color: 'var(--admin-text)', marginBottom: 6 }}>
                  {fecha
                    ? `${fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })} — ${fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs`
                    : 'Sin fecha'}
                  {t.turnos?.sedes?.nombre && ` · ${t.turnos.sedes.nombre}`}
                  {t.turnos?.mesas?.numero && ` · Mesa ${t.turnos.mesas.numero}`}
                  <span style={{ marginLeft: 8 }} className={`badge-cuota ${t.estado ? 'al-dia' : 'deuda'}`}>
                    {t.estado ? 'Confirmado' : 'Pendiente'}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        <button className="btn-primary" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      <AdminBottomNav />
    </div>
  )
}
