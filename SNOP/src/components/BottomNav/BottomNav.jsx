import { useNavigate, useLocation } from 'react-router-dom'
import './BottomNav.css'

const items = [
  {
    label: 'Inicio', path: '/inicio',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill={a ? '#2563eb' : 'none'} stroke={a ? '#2563eb' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'Turnos', path: '/mis-turnos',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill={a ? '#2563eb' : 'none'} stroke={a ? '#2563eb' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: 'Juego libre', path: '/juego-libre',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={a ? '#2563eb' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    label: 'Perfil', path: '/perfil',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={a ? '#2563eb' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const active = location.pathname === item.path
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
