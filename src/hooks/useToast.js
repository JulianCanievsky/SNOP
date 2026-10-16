/**
 * useToast — hook para gestionar notificaciones Toast en cualquier componente.
 *
 * Uso:
 *   const { toasts, showToast, removeToast } = useToast()
 *
 *   showToast('Turno cancelado', 'success')
 *   showToast('No se pudo cancelar', 'error')
 *   showToast('Sin conexión', 'warning')
 *   showToast('Recordá confirmar', 'info', 6000)   // duración en ms
 *
 *   <ToastContainer toasts={toasts} onRemove={removeToast} />
 */
import { useState, useCallback } from 'react'

let idCounter = 0

export function useToast() {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((mensaje, tipo = 'info', duracion = 4000) => {
    const id = ++idCounter
    setToasts(prev => [...prev, { id, mensaje, tipo, duracion }])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, showToast, removeToast }
}
