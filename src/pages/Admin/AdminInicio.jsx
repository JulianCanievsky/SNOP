import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AdminBottomNav from '../../components/AdminBottomNav/AdminBottomNav'
import { getStats } from '../../services/adminApi'
import { ClipboardList, Users, Calendar, Gamepad2, Trophy, Megaphone, Star, Download, ChevronRight } from 'lucide-react'
import './Admin.css'

export default function AdminInicio() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [stats, setStats]     = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  const acciones = [
    { titulo: 'Solicitudes de ingreso', sub: 'Aprobar socios nuevos',    Icon: ClipboardList, path: '/admin/solicitudes' },
    { titulo: 'Gestionar socios',       sub: 'Ver y editar socios',      Icon: Users,         path: '/admin/socios' },
    { titulo: 'Turnos de entrenamiento', sub: 'Crear y gestionar turnos', Icon: Calendar,      path: '/admin/turnos' },
    { titulo: 'Crear juego libre',      sub: 'Nuevo espacio de juego',   Icon: Gamepad2,      path: '/admin/juego-libre' },
    { titulo: 'Crear torneo',           sub: 'Torneo interno del club',  Icon: Trophy,        path: '/admin/torneos' },
    { titulo: 'Enviar comunicado',      sub: 'Notificar a socios',       Icon: Megaphone,     path: '/admin/comunicado' },
    { titulo: 'Gestión de niveles',     sub: 'Asignar niveles',          Icon: Star,          path: '/admin/niveles' },
    { titulo: 'Exportar actividades',   sub: 'Descargar Excel',          Icon: Download,      path: '/admin/exportar' },
  ]

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-header-top">
          <div>
            <p style={{ fontSize: 12, opacity: .7, margin: '0 0 2px', color: 'white' }}>ADMIN (ORGANIZADOR)</p>
            <h1>Panel admin</h1>
            <p>{user?.club_nombre ?? user?.nombre ?? 'Panel Admin'}</p>
          </div>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(255,255,255,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 16, color: 'white', flexShrink: 0,
          }}>
            {user?.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'AD'}
          </div>
        </div>
      </div>

      <div className="admin-body">
        {/* Stats */}
        <div>
          <p className="admin-label">Resumen</p>
          {cargando ? (
            <div className="stats-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="stat-card" style={{ minHeight: 72, background: '#f1f5f9' }} />
              ))}
            </div>
          ) : (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-num">{stats?.socios_activos ?? '—'}</div>
                <div className="stat-lbl">Socios activos</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{stats?.turnos_hoy ?? '—'}</div>
                <div className="stat-lbl">Turnos hoy</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{stats?.entrenadores ?? '—'}</div>
                <div className="stat-lbl">Entrenadores</div>
              </div>
              <div className="stat-card">
                <div className="stat-num" style={{ color: '#ef4444' }}>{stats?.con_deuda ?? '—'}</div>
                <div className="stat-lbl">Con deuda</div>
              </div>
            </div>
          )}
        </div>

        {/* Acciones rápidas */}
        <div>
          <p className="admin-label">Acciones rápidas</p>
          <div className="acciones-grid">
            {acciones.map((a) => (
              <button key={a.path} className="accion-card" onClick={() => navigate(a.path)}>
                <div className="accion-icono"><a.Icon size={20} strokeWidth={1.8} /></div>
                <div className="accion-info">
                  <p className="accion-titulo">{a.titulo}</p>
                  <p className="accion-sub">{a.sub}</p>
                </div>
                <ChevronRight size={16} className="accion-arrow" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <AdminBottomNav />
    </div>
  )
}
