/**
 * Reglas del listado de auditoría: filtro y hoja de exportación.
 */
import { isWithinDateRange } from '@/lib/dates';
import { buildSheet, EXCEL_FORMATS, toExcelDateTime } from '@/lib/excel-export';
import type { DeletedAuditItem, DeletedEntityType } from '@/lib/types';
import { entityTypeLabels, formatDateValue } from './snapshot-format';

export type AuditEntityFilter = DeletedEntityType | 'todos';

interface AuditFilters {
  search: string;
  entityType: AuditEntityFilter;
  fechaInicio: string;
  fechaFin: string;
}

/** Presenta la fecha de auditoria con dia y hora para facilitar trazabilidad. */
export const formatAuditDate = (fecha: string) => formatDateValue(fecha) ?? fecha;

/** Combina busqueda textual, filtro por entidad y filtro por rango de fechas. */
export function filterAuditItems(items: DeletedAuditItem[], { search, entityType, fechaInicio, fechaFin }: AuditFilters) {
  const term = search.toLowerCase();

  return items.filter(item => {
    const matchSearch =
      item.entityLabel.toLowerCase().includes(term) ||
      entityTypeLabels[item.entityType].toLowerCase().includes(term) ||
      `${item.deletedBy?.nombre ?? ''}`.toLowerCase().includes(term);

    const matchEntity = entityType === 'todos' || item.entityType === entityType;

    return matchSearch && matchEntity && isWithinDateRange(item.deletedAt.slice(0, 10), fechaInicio, fechaFin);
  });
}

/** Exporta el log filtrado, incluyendo si cada registro ya fue restaurado. */
export function buildAuditSheets(items: DeletedAuditItem[]) {
  return [
    buildSheet({
      name: 'Auditoría',
      rows: items,
      columns: [
        { header: 'Módulo', value: item => entityTypeLabels[item.entityType] },
        { header: 'Registro eliminado', value: item => item.entityLabel },
        { header: 'Eliminado por', value: item => item.deletedBy?.nombre || 'Usuario no disponible' },
        { header: 'Fecha de eliminación', value: item => toExcelDateTime(item.deletedAt), format: EXCEL_FORMATS.dateTime },
        { header: 'Estado', value: item => (item.isRestored ? 'Restaurado' : 'Eliminado') },
        { header: 'Restaurado por', value: item => item.restoredBy?.nombre },
        { header: 'Fecha de restauración', value: item => toExcelDateTime(item.restoredAt), format: EXCEL_FORMATS.dateTime },
      ],
    }),
  ];
}
