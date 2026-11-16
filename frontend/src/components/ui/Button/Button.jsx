/**
 * Button — botón base del sistema de diseño.
 *
 * Props:
 *   variant   {'primary'|'secondary'|'danger'|'ghost'} — estilo visual (default: 'primary')
 *   size      {'sm'|'md'|'lg'}  — tamaño (default: 'md')
 *   fullWidth {boolean}          — ocupa el 100% del contenedor
 *   loading   {boolean}          — muestra spinner, deshabilita el botón
 *   disabled  {boolean}
 *   type      {'button'|'submit'|'reset'} (default: 'button')
 *   onClick   {function}
 *   children  {ReactNode}
 *   ...rest   — cualquier prop adicional de <button>
 */
import styles from './Button.module.css'

export default function Button({
  variant   = 'primary',
  size      = 'md',
  fullWidth = false,
  loading   = false,
  disabled  = false,
  type      = 'button',
  onClick,
  children,
  ...rest
}) {
  const classes = [
    styles.btn,
    styles[variant],
    styles[size],
    fullWidth  ? styles.fullWidth  : '',
  ].filter(Boolean).join(' ')

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <span className={styles.spinner} aria-hidden="true" />
      )}
      {children}
    </button>
  )
}
