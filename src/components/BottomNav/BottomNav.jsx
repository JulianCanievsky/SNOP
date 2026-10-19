import { useNavigate, useLocation } from 'react-router-dom'
import styles from './BottomNav.module.css'

// Los íconos usan currentColor: toman el color del .item o .item.active
const ITEMS = [
  {
    label: 'Inicio', path: '/inicio',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" fillOpacity="0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'Turnos', path: '/mis-turnos',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: 'Juego libre', path: '/juego-libre',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    label: 'Perfil', path: '/perfil',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

export default function BottomNav({ badge = 0 }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className={styles.nav} role="navigation" aria-label="Navegación principal">
      {ITEMS.map((item) => {
        const active = pathname === item.path
        return (
          <button
            key={item.path}
            className={`${styles.item} ${active ? styles.active : ''}`}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
          >
            {item.icon()}
            {/* Badge solo en Inicio */}
            {item.path === '/inicio' && badge > 0 && (
              <span className={styles.badge} aria-label={`${badge} notificaciones no leídas`}>
                {badge > 9 ? '9+' : badge}
              </span>
            )}
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
