import { useNavigate, useLocation } from 'react-router-dom'
import './AdminBottomNav.css'

const items = [
  {
    label: 'Inicio',
    path: '/admin',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill={a ? '#4f46e5' : 'none'} stroke={a ? '#4f46e5' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'Socios',
    path: '/admin/socios',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={a ? '#4f46e5' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    label: 'Turnos',
    path: '/admin/turnos',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={a ? '#4f46e5' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: 'Actividades',
    path: '/admin/actividades',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={a ? '#4f46e5' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    label: 'Config',
    path: '/admin/config',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={a ? '#4f46e5' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
]

// Rutas que pertenecen a la sección "Actividades"
const rutasActividades = ['/admin/actividades', '/admin/juego-libre', '/admin/comunicado', '/admin/niveles']

export default function AdminBottomNav() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const pathname  = location.pathname

  function isActive(item) {
    if (item.path === '/admin/actividades') {
      return rutasActividades.includes(pathname)
    }
    if (item.path === '/admin/socios') {
      return pathname.startsWith('/admin/socios')
    }
    return pathname === item.path
  }

  return (
    <nav className="admin-bottom-nav">
      {items.map((item) => {
        const active = isActive(item)
        return (
          <button
            key={item.path}
            className={`admin-nav-item ${active ? 'activo' : ''}`}
            onClick={() => navigate(item.path)}
          >
            {item.icon(active)}
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
