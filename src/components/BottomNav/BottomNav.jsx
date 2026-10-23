import { useNavigate, useLocation } from 'react-router-dom'
import { Home, CalendarDays, Gamepad2, User } from 'lucide-react'
import styles from './BottomNav.module.css'

const ITEMS = [
  { label: 'Inicio',      path: '/inicio',      Icon: Home        },
  { label: 'Turnos',      path: '/mis-turnos',  Icon: CalendarDays },
  { label: 'Juego libre', path: '/juego-libre', Icon: Gamepad2    },
  { label: 'Perfil',      path: '/perfil',      Icon: User        },
]

export default function BottomNav({ badge = 0 }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className={styles.nav} role="navigation" aria-label="Navegación principal">
      {ITEMS.map(({ label, path, Icon }) => {
        const active = pathname === path
        return (
          <button
            key={path}
            className={`${styles.item} ${active ? styles.active : ''}`}
            onClick={() => navigate(path)}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={22} strokeWidth={1.8} />
            {/* Badge en Inicio para notificaciones/comunicados no leídos */}
            {path === '/inicio' && badge > 0 && (
              <span className={styles.badge} aria-label={`${badge} novedades`}>
                {badge > 9 ? '9+' : badge}
              </span>
            )}
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
