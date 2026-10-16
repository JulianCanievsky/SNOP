/**
 * Toast — notificación temporal no bloqueante.
 *
 * Uso con el hook useToast:
 *   const { toasts, showToast } = useToast()
 *   showToast('Mensaje', 'error')   // tipos: 'success' | 'error' | 'info' | 'warning'
 *   <ToastContainer toasts={toasts} />
 */
import { useEffect, useRef } from 'react'
import styles from './Toast.module.css'

/** Ícono SVG por tipo — sin emojis */
function Icono({ tipo }) {
  if (tipo === 'success') return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M6 10.5l2.5 2.5L14 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
  if (tipo === 'error') return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
  if (tipo === 'warning') return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3L18 17H2L10 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M10 9v4M10 14.5v.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
  // info
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 9v5M10 6.5v.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function ToastItem({ toast, onRemove }) {
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => onRemove(toast.id), toast.duracion ?? 4000)
    return () => clearTimeout(timerRef.current)
  }, [toast.id, toast.duracion, onRemove])

  return (
    <div
      className={`${styles.toast} ${styles[toast.tipo ?? 'info']}`}
      role="alert"
      aria-live="polite"
    >
      <span className={styles.icono}>
        <Icono tipo={toast.tipo ?? 'info'} />
      </span>
      <span className={styles.mensaje}>{toast.mensaje}</span>
      <button
        className={styles.cerrar}
        onClick={() => onRemove(toast.id)}
        aria-label="Cerrar notificación"
      >
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}

export function ToastContainer({ toasts, onRemove }) {
  if (!toasts?.length) return null
  return (
    <div className={styles.contenedor} aria-label="Notificaciones">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  )
}

export default ToastContainer
