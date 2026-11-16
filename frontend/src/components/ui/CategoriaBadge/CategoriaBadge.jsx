import { getCategoria, CATEGORIAS, APTO_TODOS } from '../../../constants/categorias.js'
import styles from './CategoriaBadge.module.css'

/**
 * Badge visual para categorías de jugador.
 *
 * Props (pasar UNO de los dos):
 *   nivelId   {number|null}  — id numérico de la categoría (null = "Apto para todos")
 *   nombre    {string|null}  — nombre textual (ej. "3ª categoría"). Se usa cuando
 *                              nivelId no está disponible.
 *   abreviado {boolean}      — mostrar solo la abreviatura ("3ª") en vez del nombre completo
 *
 * Ejemplos:
 *   <CategoriaBadge nivelId={3} />           → "3ª categoría"    (rojo)
 *   <CategoriaBadge nivelId={null} />        → "Apto para todos" (gris)
 *   <CategoriaBadge nivelId={1} abreviado /> → "1ª"              (dorado)
 *   <CategoriaBadge nombre="5ª categoría" /> → "5ª categoría"    (azul)
 */
export default function CategoriaBadge({ nivelId, nombre, abreviado = false }) {
  let categoria

  if (nivelId !== undefined) {
    // nivelId explícito (incluyendo null = apto para todos)
    categoria = getCategoria(nivelId)
  } else if (nombre) {
    // Fallback: buscar por nombre textual (case-insensitive)
    categoria = CATEGORIAS.find(
      c => c.nombre.toLowerCase() === nombre.toLowerCase()
    ) ?? APTO_TODOS
  } else {
    categoria = APTO_TODOS
  }

  const label    = abreviado ? categoria.abreviatura : categoria.nombre
  const cssClass = styles[categoria.colorToken] ?? styles['cat-todos']

  return (
    <span
      className={`${styles.badge} ${cssClass}`}
      title={categoria.nombre}
    >
      {label}
    </span>
  )
}
