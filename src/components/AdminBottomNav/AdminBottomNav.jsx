import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Users, CalendarDays, Settings } from 'lucide-react'
import styles from '../BottomNav/BottomNav.module.css'

const ITEMS = [
  {
    label: 'Inicio',
    path: '/admin',
    Icon: Home,
    // match exacto para no activar en sub-rutas de /admin
    exact: true,
  },
  {
    label: 'Socios',
    path: '/admin/socios',
    Icon: Users,
  },
  {
    label: 'Actividades',
    path: '/admin/actividades',
    Icon: CalendarDays,
    // rutas que activan esta pestaña
    activePaths: ['/admin/actividades', '/admin/juego-libre', '/admin/comunicado', '/admin/niveles', '/admin/turnos'],
  },
  {
    label: 'Config',
    path: '/admin/config',
    Icon: Settings,
  },
]

export default function AdminBottomNav({ badge = 0 }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  function isActive(item) {
    if (item.activePaths) return item.activePaths.some(p => pathname.startsWith(p))
    if (item.exact)       return pathname === item.path
    return pathname.startsWith(item.path)
  }

  return (
    <nav className={styles.nav} role="navigation" aria-label="Navegación administrador">
      {ITEMS.map((item) => {
        const active = isActive(item)
        const { Icon } = item
        return (
          <button
            key={item.path}
            className={`${styles.item} ${active ? styles.active : ''}`}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={22} strokeWidth={1.8} />
            {item.path === '/admin' && badge > 0 && (
              <span className={styles.badge}>{badge > 9 ? '9+' : badge}</span>
            )}
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
