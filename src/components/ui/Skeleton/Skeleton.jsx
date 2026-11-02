/**
 * Skeleton — placeholder animado para estados de carga.
 *
 * Props:
 *   width    {string|number}  — ancho (default: '100%')
 *   height   {string|number}  — alto (default: '16px')
 *   radius   {string}         — border-radius (default: 'var(--radius-sm)')
 *   count    {number}         — cantidad de líneas a renderizar (default: 1)
 *   gap      {string}         — separación entre líneas (default: 'var(--space-2)')
 *
 * Uso para un bloque de texto de 3 líneas:
 *   <Skeleton count={3} height="14px" />
 *
 * Uso para una card:
 *   <Skeleton height="120px" radius="var(--radius-md)" />
 */
import styles from './Skeleton.module.css'

function SkeletonItem({ width, height, radius }) {
  return (
    <span
      className={styles.skeleton}
      style={{
        width:        width  ?? '100%',
        height:       height ?? '16px',
        borderRadius: radius ?? 'var(--radius-sm)',
      }}
      aria-hidden="true"
    />
  )
}

export default function Skeleton({ width, height, radius, count = 1, gap = 'var(--space-2)' }) {
  if (count === 1) {
    return <SkeletonItem width={width} height={height} radius={radius} />
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonItem key={i} width={i === count - 1 ? '70%' : width} height={height} radius={radius} />
      ))}
    </div>
  )
}
