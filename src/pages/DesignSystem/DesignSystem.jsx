import { Sun, Moon } from 'lucide-react'
import CategoriaBadge from '../../components/ui/CategoriaBadge/CategoriaBadge'
import { ToastContainer } from '../../components/ui/Toast'
import { useToast } from '../../hooks/useToast'
import { useTheme } from '../../context/ThemeContext'
import { CATEGORIAS, APTO_TODOS } from '../../constants/categorias'
import styles from './DesignSystem.module.css'

// Paleta de colores a mostrar (nombre, var CSS, valor de muestra)
const PALETA = [
  { nombre: 'Primario',       varCss: '--color-primary',        color: 'var(--color-primary)' },
  { nombre: 'Primario claro', varCss: '--color-primary-light',  color: 'var(--color-primary-light)' },
  { nombre: 'Primario oscuro',varCss: '--color-primary-dark',   color: 'var(--color-primary-dark)' },
  { nombre: 'Primario sutil', varCss: '--color-primary-subtle', color: 'var(--color-primary-subtle)' },
  { nombre: 'Éxito',          varCss: '--color-success',        color: 'var(--color-success)' },
  { nombre: 'Peligro',        varCss: '--color-danger',         color: 'var(--color-danger)' },
  { nombre: 'Advertencia',    varCss: '--color-warning',       color: 'var(--color-warning)' },
  { nombre: 'Info',           varCss: '--color-info',           color: 'var(--color-info)' },
  { nombre: 'Fondo',          varCss: '--color-bg',             color: 'var(--color-bg)' },
  { nombre: 'Superficie',     varCss: '--color-surface',       color: 'var(--color-surface)' },
  { nombre: 'Texto',          varCss: '--color-text',           color: 'var(--color-text)' },
  { nombre: 'Texto muted',    varCss: '--color-text-muted',     color: 'var(--color-text-muted)' },
  { nombre: 'Borde',          varCss: '--color-border',         color: 'var(--color-border)' },
]

const TIPOGRAFIA = [
  { nombre: 'Display/2XL', cls: '2xl', size: '24px' },
  { nombre: 'XL',          cls: 'xl',  size: '20px' },
  { nombre: 'LG',          cls: 'lg',  size: '17px' },
  { nombre: 'MD',          cls: 'md',  size: '15px' },
  { nombre: 'SM',          cls: 'sm',  size: '13px' },
  { nombre: 'XS',          cls: 'xs',  size: '11px' },
]

const ESPACIADO = [
  { nombre: '--space-1', px: 4 },
  { nombre: '--space-2', px: 8 },
  { nombre: '--space-3', px: 12 },
  { nombre: '--space-4', px: 16 },
  { nombre: '--space-5', px: 20 },
  { nombre: '--space-6', px: 24 },
  { nombre: '--space-8', px: 32 },
]

const RADIOS = [
  { nombre: '--radius-sm',   px: 6 },
  { nombre: '--radius-md',   px: 12 },
  { nombre: '--radius-lg',   px: 16 },
  { nombre: '--radius-xl',   px: 20 },
  { nombre: '--radius-pill', px: 999 },
]

export default function DesignSystem() {
  // Dev-only: el componente se monta solo en desarrollo (guard en App.jsx).
  const { dark, toggleTheme } = useTheme()
  const tema = dark ? 'dark' : 'light'
  const { toasts, showToast, removeToast } = useToast()

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <h1>Sistema de diseño</h1>
          <span className={styles.devBadge}>DEV</span>
        </div>
        <button className={styles.themeBtn} onClick={toggleTheme} aria-label="Cambiar tema">
          {tema === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          {tema === 'light' ? 'Modo oscuro' : 'Modo claro'}
        </button>
      </div>

      <div className={styles.body}>
        {/* ── Paleta ─────────────────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Paleta</h2>
          <div className={styles.swatchGrid}>
            {PALETA.map(c => (
              <div key={c.varCss} className={styles.swatch}>
                <div className={styles.swatchColor} style={{ background: c.color }} />
                <div className={styles.swatchInfo}>
                  <strong>{c.nombre}</strong>
                  <span>{c.varCss}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Categorías (8 + apto para todos) ─────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Categorías (8 + Apto para todos)</h2>
          <p className={styles.note}>
            1ª = élite (orden 1) · 8ª = principiante (orden 8). Definidas en{' '}
            <code>src/constants/categorias.js</code>.
          </p>
          <div className={styles.catGrid}>
            {CATEGORIAS.map(c => (
              <div key={c.id} className={styles.catCell}>
                <CategoriaBadge nivelId={c.id} />
                <CategoriaBadge nivelId={c.id} abreviado />
                <span>id {c.id} · orden {c.orden}</span>
              </div>
            ))}
            <div className={styles.catCell}>
              <CategoriaBadge nivelId={null} />
              <CategoriaBadge nivelId={null} abreviado />
              <span>{APTO_TODOS.nombre}</span>
            </div>
          </div>
        </section>

        {/* ── Botones ─────────────────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Botones</h2>
          <div className={styles.row}>
            <button className="btn-primary">Primario</button>
            <button className="btn-secondary">Secundario</button>
            <button className="btn-danger">Peligro</button>
            <button className="btn-primary" disabled>Disabled</button>
          </div>
        </section>

        {/* ── Cards ───────────────────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Cards</h2>
          <div className="snop-card">
            <div className="snop-card-body">
              <p style={{ margin: 0, fontWeight: 700 }}>Título de card</p>
              <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Contenido de ejemplo usando la clase <code>.snop-card</code>.
              </p>
            </div>
          </div>
        </section>

        {/* ── Header + stats ──────────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Header + Stats</h2>
          <div className="snop-header">
            <h1>Título de pantalla</h1>
            <p>Subtítulo descriptivo del header</p>
          </div>
          <div className="snop-stats-grid">
            <div className="snop-stat-card">
              <div className="snop-stat-num">8</div>
              <div className="snop-stat-lbl">Créditos</div>
            </div>
            <div className="snop-stat-card">
              <div className="snop-stat-num">3</div>
              <div className="snop-stat-lbl">Usados</div>
            </div>
          </div>
        </section>

        {/* ── Inputs ──────────────────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Inputs</h2>
          <div className={styles.field}>
            <label htmlFor="ds-nombre">Nombre</label>
            <input id="ds-nombre" className={styles.input} placeholder="Escribí tu nombre" />
          </div>
          <div className={styles.field}>
            <label htmlFor="ds-sede">Sede</label>
            <select id="ds-sede" className={styles.select}>
              <option value="">Todas</option>
              <option>Belgrano</option>
              <option>Palermo</option>
            </select>
          </div>
        </section>

        {/* ── Tipografía ──────────────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Tipografía</h2>
          {TIPOGRAFIA.map(t => (
            <div key={t.cls} style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <span style={{ fontSize: `var(--font-size-${t.cls})`, fontWeight: 700 }}>
                {t.nombre}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>
                {t.size}
              </span>
            </div>
          ))}
        </section>

        {/* ── Escala de espaciado ─────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Espaciado</h2>
          {ESPACIADO.map(s => (
            <div key={s.nombre} className={styles.scaleRow}>
              <span style={{ width: 72 }}>{s.nombre}</span>
              <div className={styles.scaleBar} style={{ width: `${s.px}px` }} />
              <span>{s.px}px</span>
            </div>
          ))}
        </section>

        {/* ── Radios ──────────────────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Radios</h2>
          <div className={styles.row}>
            {RADIOS.map(r => (
              <div key={r.nombre} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 56, height: 56,
                  background: 'var(--color-primary)',
                  borderRadius: `var(${r.nombre})`,
                }} />
                <span style={{ display: 'block', marginTop: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {r.nombre}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Estados: spinner, vacío ─────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Estados</h2>
          <h3 className={styles.subsectionTitle}>Cargando</h3>
          <div className="snop-loading"><div className="snop-spinner" /></div>
          <h3 className={styles.subsectionTitle}>Vacío</h3>
          <div className="snop-empty">No hay actividades para mostrar.</div>
        </section>

        {/* ── Toast (demo interactivo) ────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Toast</h2>
          <div className={styles.row}>
            <button className="btn-primary" onClick={() => showToast('Acción exitosa', 'success')}>Éxito</button>
            <button className="btn-secondary" onClick={() => showToast('Algo salió mal', 'error')}>Error</button>
            <button className="btn-secondary" onClick={() => showToast('Información', 'info')}>Info</button>
          </div>
          <p className={styles.note}>
            Toast reemplaza a <code>alert()</code> en toda la app (Tarea 1.4).
          </p>
        </section>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
