/**
 * Definición canónica de las 8 categorías del club.
 * 1ª = la más alta (élite), 8ª = la más baja (principiante).
 *
 * Los `colorToken` mapean a variables CSS en src/index.css:
 *   --color-cat-1 … --color-cat-8 y --color-cat-todos
 *
 * NO hardcodear nombres de categoría en ningún componente:
 * usar CATEGORIAS, CATEGORIA_MAP o APTO_TODOS desde este archivo.
 */

export const CATEGORIAS = [
  { id: 1, nombre: '1ª categoría', abreviatura: '1ª', orden: 1, colorToken: 'cat-1' },
  { id: 2, nombre: '2ª categoría', abreviatura: '2ª', orden: 2, colorToken: 'cat-2' },
  { id: 3, nombre: '3ª categoría', abreviatura: '3ª', orden: 3, colorToken: 'cat-3' },
  { id: 4, nombre: '4ª categoría', abreviatura: '4ª', orden: 4, colorToken: 'cat-4' },
  { id: 5, nombre: '5ª categoría', abreviatura: '5ª', orden: 5, colorToken: 'cat-5' },
  { id: 6, nombre: '6ª categoría', abreviatura: '6ª', orden: 6, colorToken: 'cat-6' },
  { id: 7, nombre: '7ª categoría', abreviatura: '7ª', orden: 7, colorToken: 'cat-7' },
  { id: 8, nombre: '8ª categoría', abreviatura: '8ª', orden: 8, colorToken: 'cat-8' },
]

/** Lookup rápido por id: CATEGORIA_MAP[3] → { id:3, nombre:'3ª categoría', ... } */
export const CATEGORIA_MAP = Object.fromEntries(CATEGORIAS.map(c => [c.id, c]))

/** Valor especial para turnos sin categoría requerida (nivel_minimo_id = NULL) */
export const APTO_TODOS = {
  id:           null,
  nombre:       'Apto para todos',
  abreviatura:  '✓',
  orden:        null,
  colorToken:   'cat-todos',
}

/**
 * Dado un nivel_id (o null/undefined), devuelve el objeto de categoría.
 * Nunca lanza: si el id no existe, devuelve APTO_TODOS.
 * @param {number|null|undefined} nivelId
 * @returns {{ id, nombre, abreviatura, orden, colorToken }}
 */
export function getCategoria(nivelId) {
  if (nivelId == null) return APTO_TODOS
  return CATEGORIA_MAP[nivelId] ?? APTO_TODOS
}

/**
 * ¿Puede un socio de la categoría `nivelId` anotarse a un evento (juego libre / torneo)?
 * Regla: lista vacía o null = abierto a todas las categorías.
 * Si el evento restringe categorías y el socio no tiene categoría asignada, no puede.
 * Compara como números porque la BD puede devolver strings.
 * @param {Array<number|string>|null|undefined} nivelesHabilitados
 * @param {number|string|null|undefined} nivelId
 * @returns {boolean}
 */
export function nivelHabilitado(nivelesHabilitados, nivelId) {
  if (!Array.isArray(nivelesHabilitados) || nivelesHabilitados.length === 0) return true
  if (nivelId == null) return false
  return nivelesHabilitados.map(Number).includes(Number(nivelId))
}
