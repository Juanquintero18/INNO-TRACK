/**
 * Reglas del listado de movimientos: filtro, orden y hoja de exportación.
 */
import { isWithinDateRange } from '@/lib/dates';
import { buildSheet, EXCEL_FORMATS, toExcelDate } from '@/lib/excel-export';
import { sortRows, type SortDirection, type SortValue } from '@/lib/sorting';
import type { MovimientoInventario } from '@/lib/types';

export type MovimientoSortField = 'fecha' | 'tipo' | 'material' | 'cantidad' | 'responsable' | 'motivo' | 'referencia';

/** Valor del filtro de tipo que no descarta ningún movimiento. */
export const TODOS_LOS_TIPOS = 'todos';

interface MovimientoFilters {
  search: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
}

/** Aplica busqueda textual, filtro por tipo y rango opcional de fechas. */
export function filterMovimientos(
  movimientos: MovimientoInventario[],
  { search, tipo, fechaInicio, fechaFin }: MovimientoFilters
) {
  const term = search.toLowerCase();

  return movimientos.filter(movimiento => {
    const matchSearch =
      (movimiento.materia_prima?.nombre ?? '').toLowerCase().includes(term) ||
      (movimiento.referencia ?? '').toLowerCase().includes(term) ||
      (movimiento.motivo ?? '').toLowerCase().includes(term);

    const matchTipo = tipo === TODOS_LOS_TIPOS || movimiento.tipo === tipo;

    return matchSearch && matchTipo && isWithinDateRange(movimiento.fecha, fechaInicio, fechaFin);
  });
}

function getSortValue(movimiento: MovimientoInventario, field: MovimientoSortField): SortValue {
  switch (field) {
    case 'material':
      return (movimiento.materia_prima?.nombre ?? '').toLowerCase();
    case 'cantidad':
      return movimiento.cantidad ?? 0;
    case 'responsable':
      return (movimiento.proveedor?.nombre ?? movimiento.trabajador?.nombre ?? '').toLowerCase();
    case 'motivo':
      return (movimiento.motivo ?? '').toLowerCase();
    case 'referencia':
      return (movimiento.referencia ?? '').toLowerCase();
    case 'tipo':
      return (movimiento.tipo ?? '').toLowerCase();
    default:
      return movimiento.fecha ?? '';
  }
}

export function sortMovimientos(
  movimientos: MovimientoInventario[],
  field: MovimientoSortField,
  direction: SortDirection
) {
  return sortRows(movimientos, movimiento => getSortValue(movimiento, field), direction);
}

/** Exporta los movimientos visibles con el filtro y el orden actuales. */
export function buildMovimientosSheets(movimientos: MovimientoInventario[]) {
  return [
    buildSheet({
      name: 'Movimientos',
      rows: movimientos,
      columns: [
        { header: 'Fecha', value: movimiento => toExcelDate(movimiento.fecha) },
        { header: 'Tipo', value: movimiento => movimiento.tipo },
        { header: 'Material', value: movimiento => movimiento.materia_prima?.nombre },
        { header: 'Cantidad', value: movimiento => movimiento.cantidad, format: EXCEL_FORMATS.decimal },
        { header: 'Unidad', value: movimiento => movimiento.materia_prima?.unidad_medida?.abreviatura },
        { header: 'Proveedor', value: movimiento => movimiento.proveedor?.nombre },
        { header: 'Trabajador', value: movimiento => movimiento.trabajador?.nombre },
        { header: 'Motivo', value: movimiento => movimiento.motivo },
        { header: 'Referencia', value: movimiento => movimiento.referencia },
      ],
    }),
  ];
}
