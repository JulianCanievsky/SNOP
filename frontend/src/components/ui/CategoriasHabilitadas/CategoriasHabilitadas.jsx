import CategoriaBadge from '../CategoriaBadge/CategoriaBadge.jsx'
import styles from './CategoriasHabilitadas.module.css'

/**
 * Lista de categorías habilitadas para un evento (juego libre / torneo).
 * Lista vacía = "Apto para todos".
 *
 * Props:
 *   ids       {Array<number|string>} — niveles_habilitados del evento
 *   abreviado {boolean}              — badges cortos ("3ª") para tarjetas
 */
export default function CategoriasHabilitadas({ ids, abreviado = false }) {
  const lista = Array.isArray(ids) ? [...new Set(ids.map(Number))].sort((a, b) => a - b) : []

  return (
    <span className={styles.lista} aria-label="Categorías habilitadas">
      {lista.length === 0
        ? <CategoriaBadge nivelId={null} abreviado={abreviado} />
        : lista.map(id => <CategoriaBadge key={id} nivelId={id} abreviado={abreviado} />)}
    </span>
  )
}
