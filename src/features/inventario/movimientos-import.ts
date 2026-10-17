/**
 * Columnas de la vista previa al importar movimientos desde Excel.
 */
import { previewValue, type ImportPreviewColumn } from '@/features/importing/ImportExcelDialog';

export const MOVIMIENTOS_IMPORT_COLUMNS: ImportPreviewColumn[] = [
  { header: 'Material', value: row => previewValue(row, 'materia_prima') },
  { header: 'Tipo', value: row => previewValue(row, 'tipo') },
  // El responsable es el proveedor en las entradas y el trabajador en las salidas.
  { header: 'Responsable', value: row => previewValue(row, 'proveedor', 'trabajador') },
  { header: 'Referencia', value: row => previewValue(row, 'referencia'), className: 'font-mono text-xs' },
];
