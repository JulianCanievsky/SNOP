/**
 * Spinner — indicador de carga circular.
 *
 * Props:
 *   size    {'sm'|'md'|'lg'}  — tamaño (default: 'md')
 *   center  {boolean}         — centra en el contenedor padre (default: false)
 *   label   {string}          — aria-label para accesibilidad (default: 'Cargando')
 */
import styles from './Spinner.module.css'

const SIZE_MAP = { sm: 20, md: 28, lg: 40 }

export default function Spinner({ size = 'md', center = false, label = 'Cargando' }) {
  const px = SIZE_MAP[size] ?? 28
  return (
    <div
      className={`${styles.wrapper} ${center ? styles.center : ''}`}
      role="status"
      aria-label={label}
    >
      <span
        className={styles.spinner}
        style={{ width: px, height: px }}
        aria-hidden="true"
      />
    </div>
  )
}
