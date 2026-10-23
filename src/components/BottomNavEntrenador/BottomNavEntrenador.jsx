import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Users, Clock, User, Bell } from 'lucide-react'
import styles from '../BottomNav/BottomNav.module.css'

const ITEMS = [
  { label: 'Inicio',    path: '/entrenador/inicio',    Icon: Home  },
  { label: 'Alumnos',   path: '/entrenador/mis-alumnos', Icon: Users },
  { label: 'Horarios',  path: '/entrenador/mis-horarios', Icon: Clock },
  { label: 'Notif.',    path: '/entrenador/notificaciones', Icon: Bell },
  { label: 'Perfil',    path: '/entrenador/perfil',    Icon: User  },
]

export default function BottomNavEntrenador({ badge = 0 }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className={styles.nav} role="navigation" aria-label="Navegación entrenador">
      {ITEMS.map(({ label, path, Icon }) => {
        const active = pathname.startsWith(path)
        const esNotif = path === '/entrenador/notificaciones'
        return (
          <button
            key={path}
            className={`${styles.item} ${active ? styles.active : ''}`}
            onClick={() => navigate(path)}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={22} strokeWidth={1.8} />
            {esNotif && badge > 0 && (
              <span className={styles.badge} aria-label={`${badge} notificaciones no leídas`}>
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
