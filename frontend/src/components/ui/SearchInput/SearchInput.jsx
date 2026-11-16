/**
 * SearchInput — campo de búsqueda reutilizable.
 * Normaliza sin acentos ni mayúsculas para comparación.
 *
 * Props:
 *   value      string   — valor controlado
 *   onChange   fn       — callback con el nuevo valor
 *   placeholder string  — texto de placeholder
 *   className  string   — clase extra opcional
 */
import { Search, X } from 'lucide-react'
import styles from './SearchInput.module.css'

export function normalizar(str) {
  return (str ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export default function SearchInput({ value, onChange, placeholder = 'Buscar...', className = '' }) {
  return (
    <div className={`${styles.wrap} ${className}`}>
      <Search size={16} className={styles.ico} />
      <input
        type="search"
        className={styles.input}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          className={styles.clear}
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
