import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AdminBottomNav from '../../components/AdminBottomNav/AdminBottomNav'
import { getConfig } from '../../services/adminApi'
import './Admin.css'

export default function ConfigAdmin() {
  const navigate   = useNavigate()
  const { logout } = useAuth()

  const [config,   setConfig]   = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    getConfig()
      .then(setConfig)
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const admin    = config?.admin
  const club     = config?.club
  const sedes    = config?.sedes ?? []
  const iniciales = admin?.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'AD'

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Configuración</h1>
        <p>Club y cuenta</p>
      </div>

      <div className="admin-body">
        {cargando ? (
          <div className="estado-carga"><div className="spinner-admin" /></div>
        ) : (
          <>
            {/* Perfil admin */}
            <div className="admin-card admin-card-body" style={{ textAlign: 'center' }}>
              <div className="config-avatar">{iniciales}</div>
              <p className="config-nombre">{admin?.nombre ?? '—'}</p>
              <p className="config-rol">Admin · {club?.nombre ?? 'Club'}</p>
            </div>

            {/* Info club */}
            <div>
              <p className="admin-label">Club</p>
              <div className="admin-card admin-card-body">
                <div className="config-row">
                  <span className="config-row-label">Nombre del club</span>
                  <span className="config-row-value">{club?.nombre ?? '—'}</span>
                </div>
                {sedes.length > 0 && (
                  <div className="config-row">
                    <span className="config-row-label">
                      {sedes.length === 1 ? 'Sede principal' : 'Sedes'}
                    </span>
                    <span className="config-row-value" style={{ textAlign: 'right' }}>
                      {sedes.map(s => s.nombre).join(' · ')}
                    </span>
                  </div>
                )}
                <div className="config-row">
                  <span className="config-row-label">Entrenadores activos</span>
                  <span className="config-row-value">{config?.entrenadores_activos ?? '—'}</span>
                </div>
                <div className="config-row">
                  <span className="config-row-label">Socios activos</span>
                  <span className="config-row-value">{config?.socios_activos ?? '—'}</span>
                </div>
              </div>
            </div>

            {/* WhatsApp */}
            {club?.whatsapp_link && (
              <div>
                <p className="admin-label">Grupo de WhatsApp</p>
                <div className="admin-card admin-card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: 'var(--admin-muted)' }}>Link al grupo del club</span>
                  <button
                    className="btn-whatsapp"
                    onClick={() => window.open(club.whatsapp_link, '_blank')}
                  >
                    Abrir grupo
                  </button>
                </div>
              </div>
            )}

            {/* Cerrar sesión */}
            <button className="btn-secondary" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </>
        )}
      </div>

      <AdminBottomNav />
    </div>
  )
}
