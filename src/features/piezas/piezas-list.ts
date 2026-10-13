/**
 * Reglas del listado de piezas: filtro, orden y hojas de exportación.
 */
import { isWithinDateRange } from '@/lib/dates';
import { calcularCostoPieza, calcularPesoTeoricoPieza, calcularSubtotalMaterial } from '@/lib/domain-utils';
import { buildSheet, EXCEL_FORMATS, toExcelDate } from '@/lib/excel-export';
import { sortRows, textSortValue, type SortDirection, type SortValue } from '@/lib/sorting';
import type { Pieza } from '@/lib/types';

export type PiezaSortField =
  | 'trace_id'
  | 'nombre'
  | 'proyecto'
  | 'orden'
  | 'fecha_gelcoat'
  | 'fecha_qc'
  | 'peso_real'
  | 'costo'
  | 'estado';

/** Una pieza se considera completada cuando ya pasó control de calidad. */
export const getEstadoPieza = (pieza: Pieza) => (pieza.fecha_qc ? 'Completada' : 'En proceso');

interface PiezaFilters {
  search: string;
  fechaInicio: string;
  fechaFin: string;
}

/** Filtra piezas por texto y por ventana temporal de control de calidad. */
export function filterPiezas(piezas: Pieza[], { search, fechaInicio, fechaFin }: PiezaFilters) {
  const term = search.toLowerCase();

  return piezas.filter(pieza => {
    const matchSearch =
      (pieza.nombre ?? '').toLowerCase().includes(term) ||
      (pieza.trace_id ?? '').toLowerCase().includes(term) ||
      (pieza.orden?.codigo_orden ?? '').toLowerCase().includes(term) ||
      (pieza.orden?.proyecto?.nombre ?? '').toLowerCase().includes(term);

    return matchSearch && isWithinDateRange(pieza.fecha_qc, fechaInicio, fechaFin);
  });
}

/** Valor comparable por columna, incluyendo costo derivado y estado. */
function getSortValue(pieza: Pieza, field: PiezaSortField): SortValue {
  switch (field) {
    case 'proyecto':
      return (pieza.orden?.proyecto?.nombre ?? '').toLowerCase();
    case 'orden':
      return (pieza.orden?.codigo_orden ?? '').toLowerCase();
    case 'peso_real':
      return pieza.peso_real ?? 0;
    case 'costo':
      return calcularCostoPieza(pieza);
    case 'estado':
      return getEstadoPieza(pieza).toLowerCase();
    case 'fecha_gelcoat':
      return pieza.fecha_gelcoat ?? '';
    case 'fecha_qc':
      return pieza.fecha_qc ?? '';
    default:
      return textSortValue(pieza[field]);
  }
}

export function sortPiezas(piezas: Pieza[], field: PiezaSortField, direction: SortDirection) {
  return sortRows(piezas, pieza => getSortValue(pieza, field), direction);
}

/** Exporta las piezas visibles y, en una segunda hoja, el detalle de sus materiales. */
export function buildPiezasSheets(piezas: Pieza[]) {
  return [
    buildSheet({
      name: 'Piezas',
      rows: piezas,
      columns: [
        { header: 'Trace ID', value: pieza => pieza.trace_id },
        { header: 'Nombre', value: pieza => pieza.nombre },
        { header: 'Proyecto', value: pieza => pieza.orden?.proyecto?.nombre },
        { header: 'Orden', value: pieza => pieza.orden?.codigo_orden },
        { header: 'Fecha Gelcoat', value: pieza => toExcelDate(pieza.fecha_gelcoat) },
        { header: 'Fecha QC', value: pieza => toExcelDate(pieza.fecha_qc) },
        { header: 'Peso real (kg)', value: pieza => pieza.peso_real, format: EXCEL_FORMATS.decimal },
        { header: 'Peso teórico (kg)', value: pieza => calcularPesoTeoricoPieza(pieza), format: EXCEL_FORMATS.decimal },
        { header: 'Costo total', value: pieza => calcularCostoPieza(pieza), format: EXCEL_FORMATS.money },
        { header: 'Estado', value: pieza => getEstadoPieza(pieza) },
      ],
    }),
    buildSheet({
      name: 'Materiales por pieza',
      rows: piezas.flatMap(pieza => (pieza.materias_primas ?? []).map(material => ({ pieza, material }))),
      columns: [
        { header: 'Trace ID', value: ({ pieza }) => pieza.trace_id },
        { header: 'Pieza', value: ({ pieza }) => pieza.nombre },
        { header: 'Material', value: ({ material }) => material.materia_prima?.nombre },
        { header: 'Cant. teórica', value: ({ material }) => material.cantidad_teorica, format: EXCEL_FORMATS.decimal },
        { header: 'Cant. real', value: ({ material }) => material.cantidad_real, format: EXCEL_FORMATS.decimal },
        { header: 'Costo unit.', value: ({ material }) => material.materia_prima?.costo ?? 0, format: EXCEL_FORMATS.money },
        { header: 'Subtotal', value: ({ material }) => calcularSubtotalMaterial(material), format: EXCEL_FORMATS.money },
      ],
    }),
  ];
}
