import { useNavigate, useLocation } from 'react-router-dom'
import styles from '../BottomNav/BottomNav.module.css'

const ITEMS = [
  {
    label: 'Inicio', path: '/entrenador/inicio',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'Alumnos', path: '/entrenador/mis-alumnos',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    label: 'Horarios', path: '/entrenador/mis-horarios',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    label: 'Perfil', path: '/entrenador/perfil',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

export default function BottomNavEntrenador({ badge = 0 }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className={styles.nav} role="navigation" aria-label="Navegación entrenador">
      {ITEMS.map((item) => {
        const active = pathname.startsWith(item.path)
        return (
          <button
            key={item.path}
            className={`${styles.item} ${active ? styles.active : ''}`}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
          >
            {item.icon()}
            {item.path === '/entrenador/inicio' && badge > 0 && (
              <span className={styles.badge}>{badge > 9 ? '9+' : badge}</span>
            )}
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
