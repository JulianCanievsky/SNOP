/**
 * EmptyState — pantalla vacía estandarizada.
 *
 * Props:
 *   icon    {ReactNode}  — ícono o emoji opcional
 *   title   {string}     — título (requerido)
 *   message {string}     — descripción opcional
 *   action  {ReactNode}  — botón u acción opcional
 */
import styles from './EmptyState.module.css'

export default function EmptyState({ icon, title, message, action }) {
  return (
    <div className={styles.wrapper} role="status">
      {icon && <div className={styles.icon} aria-hidden="true">{icon}</div>}
      <p className={styles.title}>{title}</p>
      {message && <p className={styles.message}>{message}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
