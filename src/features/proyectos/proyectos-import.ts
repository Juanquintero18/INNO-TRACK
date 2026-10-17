/**
 * Columnas de la vista previa al importar proyectos y órdenes desde Excel.
 */
import { previewValue, type ImportPreviewColumn } from '@/features/importing/import-preview';
import { formatStatusLabel } from './proyectos-utils';

// El backend resuelve el estado (vacío toma el inicial); se muestra como en las tablas.
const estadoColumn: ImportPreviewColumn = {
  header: 'Estado',
  value: row => formatStatusLabel(previewValue(row, 'estado')),
};

export const PROYECTOS_IMPORT_COLUMNS: ImportPreviewColumn[] = [
  { header: 'Código', value: row => previewValue(row, 'codigo'), className: 'font-mono' },
  { header: 'Nombre', value: row => previewValue(row, 'nombre') },
  { header: 'Inicio', value: row => previewValue(row, 'fecha_inicio') },
  estadoColumn,
];

export const ORDENES_IMPORT_COLUMNS: ImportPreviewColumn[] = [
  { header: 'Proyecto', value: row => previewValue(row, 'proyecto') },
  { header: 'Orden', value: row => previewValue(row, 'codigo_orden'), className: 'font-mono' },
  { header: 'Fecha', value: row => previewValue(row, 'fecha_creacion') },
  estadoColumn,
];
