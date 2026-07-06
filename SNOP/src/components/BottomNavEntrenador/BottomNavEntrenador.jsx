import { useNavigate, useLocation } from 'react-router-dom'
import './BottomNavEntrenador.css'

const items = [
  {
    label: 'Inicio',
    path: '/entrenador/inicio',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill={a ? '#2563eb' : 'none'} stroke={a ? '#2563eb' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'Alumnos',
    path: '/entrenador/mis-alumnos',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={a ? '#2563eb' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    label: 'Horarios',
    path: '/entrenador/mis-horarios',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={a ? '#2563eb' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    label: 'Perfil',
    path: '/entrenador/perfil',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={a ? '#2563eb' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

export default function BottomNavEntrenador() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const active = location.pathname.startsWith(item.path)
        return (
          <button
            key={item.path}
            className={`nav-item ${active ? 'activo' : ''}`}
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
