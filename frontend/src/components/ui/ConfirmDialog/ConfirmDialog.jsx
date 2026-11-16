/**
 * ConfirmDialog — bottom sheet de confirmación.
 * Reemplaza window.confirm() con una UI accesible y consistente.
 *
 * Props:
 *   open      {boolean}   — si se muestra
 *   title     {string}    — título del diálogo
 *   message   {string}    — descripción/detalle
 *   confirmLabel {string} — texto del botón de confirmación (default: "Confirmar")
 *   cancelLabel  {string} — texto del botón cancelar (default: "Cancelar")
 *   danger    {boolean}   — si el botón principal debe ser rojo
 *   onConfirm {function}  — callback al confirmar
 *   onCancel  {function}  — callback al cancelar
 */
import { useEffect } from 'react'
import styles from './ConfirmDialog.module.css'

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel  = 'Cancelar',
  danger       = false,
  onConfirm,
  onCancel,
}) {
  // Cerrar con Escape
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onCancel?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel?.() }}
    >
      <div className={styles.sheet}>
        {title && (
          <h3 id="confirm-dialog-title" className={styles.title}>
            {title}
          </h3>
        )}
        {message && (
          <p className={styles.message}>{message}</p>
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btnCancel}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? styles.btnDanger : styles.btnConfirm}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
