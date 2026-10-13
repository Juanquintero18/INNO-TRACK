/**
 * Ordenamiento de listados por una columna.
 */
export type SortDirection = 'asc' | 'desc';

export type SortValue = string | number;

/** Compara dos valores ya normalizados respetando el sentido del orden. */
export function compareSortValues(left: SortValue, right: SortValue, direction: SortDirection) {
  if (left < right) return direction === 'asc' ? -1 : 1;
  if (left > right) return direction === 'asc' ? 1 : -1;
  return 0;
}

/** Devuelve una copia ordenada según el valor comparable de cada fila. */
export function sortRows<T>(rows: T[], getValue: (row: T) => SortValue, direction: SortDirection) {
  return [...rows].sort((left, right) => compareSortValues(getValue(left), getValue(right), direction));
}

/** Normaliza un texto opcional para compararlo sin distinguir mayúsculas. */
export function textSortValue(value: unknown) {
  return (value ?? '').toString().toLowerCase();
}
