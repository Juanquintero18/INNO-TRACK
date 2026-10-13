/**
 * Formato de los respaldos de auditoría.
 *
 * Cada registro eliminado guarda una copia ("snapshot") con los nombres de
 * campo técnicos del backend; aquí se traducen a textos legibles.
 */
import { BOGOTA_TIMEZONE } from '@/lib/dates';
import type { DeletedAuditItem, DeletedEntityType } from '@/lib/types';

/** Etiquetas visibles para convertir los tipos tecnicos del backend en textos legibles. */
export const entityTypeLabels: Record<DeletedEntityType | 'todos', string> = {
  todos: 'Todos',
  pieza: 'Piezas',
  'materia-prima': 'Materias primas',
  'movimiento-inventario': 'Inventario',
  proveedor: 'Proveedores',
  trabajador: 'Trabajadores',
  usuario: 'Usuarios',
};

const snapshotFieldLabels: Partial<Record<string, string>> = {
  id: 'ID interno',
  orden_id: 'Orden',
  proyecto_id: 'Proyecto',
  usuario_id: 'Usuario',
  materia_prima_id: 'Materia prima',
  proveedor_id: 'Proveedor',
  trabajador_produccion_id: 'Trabajador',
  unidad_medida_id: 'Unidad de medida',
  pieza_id: 'Pieza',
  codigo_orden: 'Código de orden',
  codigo_trabajador: 'Código de trabajador',
  fecha_actualizacion: 'Fecha de actualización',
  fecha_creacion: 'Fecha de creación',
  fecha_inicio: 'Fecha de inicio',
  fecha_fin: 'Fecha de fin',
  fecha_gelcoat: 'Fecha de gelcoat',
  fecha_qc: 'Fecha de QC',
  trace_id: 'Trace ID',
  peso_real: 'Peso real',
  cantidad_teorica: 'Cantidad teórica',
  cantidad_real: 'Cantidad real',
};

/** Traducción de valores cerrados (enumeraciones) por nombre de campo. */
export const snapshotValueLabels: Partial<Record<string, Record<string, string>>> = {
  tipo: {
    entrada: 'Entrada',
    salida: 'Salida',
    ajuste: 'Ajuste',
  },
  accion: {
    creacion: 'Creación',
    edicion: 'Edición',
  },
};

export type SnapshotRecord = Record<string, unknown>;

export interface FormattedSnapshotValue {
  primary: string;
  secondary?: string;
  tone?: 'default' | 'muted';
}

export type ResolveSnapshotValue = (
  fieldName: string | undefined,
  value: unknown,
  auditItem: DeletedAuditItem
) => FormattedSnapshotValue;

export const isSnapshotObject = (value: unknown): value is SnapshotRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const getSnapshotRecord = (value: unknown): SnapshotRecord | null => (isSnapshotObject(value) ? value : null);

/** Nombre legible de un campo: el definido arriba o, si no existe, el técnico sin guiones bajos. */
export function formatSnapshotField(field: string) {
  const explicitLabel = snapshotFieldLabels[field];

  if (explicitLabel) return explicitLabel;

  const normalized = field
    .replace(/_/g, ' ')
    .replace(/\bid\b/gi, 'ID')
    .replace(/\sqc\b/gi, ' QC')
    .trim();

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

/** Interpreta un valor como identificador entero, venga como número o como texto. */
export function getNumericId(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return null;
}

/** Convierte un valor técnico como `en_proceso` en "En Proceso". */
export const humanizeToken = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());

export const isDateLikeField = (fieldName: string) => fieldName.startsWith('fecha') || fieldName.endsWith('_at');

/**
 * Formatea una fecha del respaldo, con hora solo si el valor la trae.
 * Devuelve `null` cuando el texto no es una fecha reconocible.
 */
export function formatDateValue(value: string) {
  const hasTime = value.includes('T') || /\b\d{2}:\d{2}/.test(value);

  if (!hasTime && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) return null;

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(hasTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: BOGOTA_TIMEZONE,
  }).format(parsedDate);
}

/** Campos del respaldo que no se mostraron en el resumen principal ni deben ocultarse. */
export const getRemainingSnapshot = (snapshot: SnapshotRecord, handledFields: string[], hiddenFields: string[] = []) =>
  Object.fromEntries(
    Object.entries(snapshot).filter(([field]) => !handledFields.includes(field) && !hiddenFields.includes(field))
  );
