/**
 * Columnas de la vista previa de una importación desde Excel.
 */
import type { ImportPreviewRow } from '@/lib/types';

const EMPTY = '—';

/** Columna de la tabla de vista previa, entre "Estado" y "Errores". */
export interface ImportPreviewColumn {
  header: string;
  value: (row: ImportPreviewRow) => string;
  className?: string;
}

/** Valor de una columna: el nombre reconocido en el sistema o, si no, el texto del archivo. */
export const previewValue = (row: ImportPreviewRow, ...keys: string[]) =>
  keys.map(key => row.resolved[key] ?? row.values[key]).find(value => value) || EMPTY;
