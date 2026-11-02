/**
 * AppNav — Navegación inferior unificada para todos los roles.
 * Reemplaza BottomNav, AdminBottomNav y BottomNavEntrenador.
 *
 * Props:
 *   badge {number} — número de notificaciones/novedades sin leer
 *
 * Infiere el rol desde AuthContext (req.user.tipo_usuario_id):
 *   1 = socio → items de socio
 *   2 = entrenador → items de entrenador
 *   3 = admin → items de admin
 *
 * Sigue usando BottomNav.module.css para mantener la apariencia.
 */
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, CalendarDays, Gamepad2, User, Users, Clock, Bell, Settings } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import styles from '../BottomNav/BottomNav.module.css'

// Items por rol
const ITEMS_SOCIO = [
  { label: 'Inicio',      path: '/inicio',      Icon: Home,         exact: true },
  { label: 'Turnos',      path: '/mis-turnos',  Icon: CalendarDays                },
  { label: 'Juego libre', path: '/juego-libre', Icon: Gamepad2                    },
  { label: 'Perfil',      path: '/perfil',      Icon: User                        },
]

const ITEMS_ENTRENADOR = [
  { label: 'Inicio',    path: '/entrenador/inicio',         Icon: Home  },
  { label: 'Alumnos',   path: '/entrenador/mis-alumnos',    Icon: Users },
  { label: 'Horarios',  path: '/entrenador/mis-horarios',   Icon: Clock },
  { label: 'Notif.',    path: '/entrenador/notificaciones', Icon: Bell, isBadge: true },
  { label: 'Perfil',    path: '/entrenador/perfil',         Icon: User  },
]

const ITEMS_ADMIN = [
  {
    label: 'Inicio',
    path: '/admin',
    Icon: Home,
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
    activePaths: ['/admin/actividades', '/admin/juego-libre', '/admin/comunicado', '/admin/niveles', '/admin/turnos'],
  },
  {
    label: 'Config',
    path: '/admin/config',
    Icon: Settings,
  },
]

// Mapeo de rol a items
const ITEMS_BY_ROL = {
  1: ITEMS_SOCIO,
  2: ITEMS_ENTRENADOR,
  3: ITEMS_ADMIN,
}

// Label de aria por rol
const ARIA_LABEL_BY_ROL = {
  1: 'Navegación principal',
  2: 'Navegación entrenador',
  3: 'Navegación administrador',
}

function isItemActive(item, pathname) {
  if (item.activePaths) return item.activePaths.some(p => pathname.startsWith(p))
  if (item.exact)       return pathname === item.path
  return pathname.startsWith(item.path)
}

export default function AppNav({ badge = 0 }) {
  const navigate       = useNavigate()
  const { pathname }   = useLocation()
  const { user }       = useAuth()
  const rol            = user?.tipo_usuario_id ?? 1
  const items          = ITEMS_BY_ROL[rol] ?? ITEMS_SOCIO
  const ariaLabel      = ARIA_LABEL_BY_ROL[rol] ?? 'Navegación'

  return (
    <nav className={styles.nav} role="navigation" aria-label={ariaLabel}>
      {items.map((item) => {
        const active = isItemActive(item, pathname)
        const { Icon, label, path, isBadge } = item

        // Badge:
        //   - socio: en /inicio (comunicados + notifs no leídas)
        //   - entrenador: en /entrenador/notificaciones
        //   - admin: en /admin (badge prop, si se pasa)
        const showBadge =
          badge > 0 && (
            (rol === 1 && path === '/inicio') ||
            (rol === 2 && isBadge) ||
            (rol === 3 && path === '/admin')
          )

        return (
          <button
            key={path}
            className={`${styles.item} ${active ? styles.active : ''}`}
            onClick={() => navigate(path)}
            aria-label={showBadge ? `${label} — ${badge} sin leer` : label}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={22} strokeWidth={1.8} />
            {showBadge && (
              <span className={styles.badge} aria-hidden="true">
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
