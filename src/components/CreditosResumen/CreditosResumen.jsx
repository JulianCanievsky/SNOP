import { useEffect, useState } from 'react'
import api from '../../lib/apiClient.js'
import styles from './CreditosResumen.module.css'

const TZ = 'America/Argentina/Buenos_Aires'

function formatFecha(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'long', timeZone: TZ,
  })
}

/**
 * Bloque de resumen de créditos de recupero del socio.
 * Props:
 *   compact {boolean} — versión de 1 línea para cabeceras
 */
export default function CreditosResumen({ compact = false }) {
  const [data,     setData]     = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    api.get('/creditos')
      .then(r => setData(r.data.data))
      .catch(() => setData(null))
      .finally(() => setCargando(false))
  }, [])

  if (cargando) {
    return (
      <div className={styles.card}>
        <div className={styles.cargando}>
          <div className="snop-spinner" style={{ margin: '0 auto' }} />
        </div>
      </div>
    )
  }

  if (!data) return null

  const { disponibles, usados, vencidos, creditos = [] } = data

  // Crédito que vence más pronto
  const proximo = creditos
    .filter(c => !c.usado && !c.vencido)
    .sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento))[0]

  if (compact) {
    return (
      <div className={styles.card} style={{ padding: 'var(--space-3) var(--space-4)' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
          Créditos disponibles:{' '}
          <strong style={{ color: disponibles > 0 ? 'var(--color-primary)' : 'var(--color-text-subtle)' }}>
            {disponibles}
          </strong>
        </span>
      </div>
    )
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <p className={styles.titulo}>Créditos de recupero</p>
      </div>

      {disponibles === 0 && usados === 0 && vencidos === 0 ? (
        <p className={styles.sinBono}>Sin créditos este mes</p>
      ) : (
        <>
          <div className={styles.grid}>
            <div className={styles.item}>
              <span className={`${styles.num} ${disponibles === 0 ? styles.muted : ''}`}>
                {disponibles}
              </span>
              <span className={styles.lbl}>Disponibles</span>
            </div>
            <div className={styles.item}>
              <span className={`${styles.num} ${styles.muted}`}>{usados}</span>
              <span className={styles.lbl}>Usados</span>
            </div>
            <div className={styles.item}>
              <span className={`${styles.num} ${vencidos > 0 ? styles.warning : styles.muted}`}>
                {vencidos}
              </span>
              <span className={styles.lbl}>Vencidos</span>
            </div>
          </div>

          {proximo && (
            <p className={styles.vencimiento}>
              Próximo vencimiento:{' '}
              <strong>{formatFecha(proximo.fecha_vencimiento)}</strong>
            </p>
          )}
        </>
      )}
    </div>
  )
}
