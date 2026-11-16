/**
 * ErrorState — pantalla de error estandarizada.
 *
 * Props:
 *   message  {string}    — mensaje de error (requerido)
 *   onRetry  {function}  — callback para "Reintentar" (opcional)
 *   retryLabel {string}  — label del botón de reintento (default: 'Reintentar')
 */
import styles from './ErrorState.module.css'

export default function ErrorState({ message, onRetry, retryLabel = 'Reintentar' }) {
  return (
    <div className={styles.wrapper} role="alert">
      <span className={styles.icon} aria-hidden="true">⚠️</span>
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <button type="button" className={styles.retryBtn} onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  )
}
