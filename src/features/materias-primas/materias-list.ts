/**
 * Reglas del listado de materias primas: filtro, orden y hoja de exportación.
 */
import { isWithinDateRange } from '@/lib/dates';
import { getMateriaPrimaStabilityThresholds, getStockStabilityMeta } from '@/lib/domain-utils';
import { buildSheet, EXCEL_FORMATS, toExcelDate } from '@/lib/excel-export';
import { compareSortValues, type SortDirection, type SortValue } from '@/lib/sorting';
import type { MateriaPrima } from '@/lib/types';
import type { MateriaPrimaSortField } from './MateriasPrimasTable';

type GetStockLevel = (materiaId: number) => number;

interface MateriaFilters {
  search: string;
  fechaInicio: string;
  fechaFin: string;
}

/** Aplica busqueda por nombre y rango opcional de fechas de actualizacion. */
export function filterMaterias(materias: MateriaPrima[], { search, fechaInicio, fechaFin }: MateriaFilters) {
  const term = search.toLowerCase();

  return materias.filter(
    materia =>
      materia.nombre.toLowerCase().includes(term) &&
      isWithinDateRange(materia.fecha_actualizacion, fechaInicio, fechaFin)
  );
}

function getSortValue(materia: MateriaPrima, field: MateriaPrimaSortField, stock: number): SortValue {
  switch (field) {
    case 'unidad':
      return (materia.unidad_medida?.nombre ?? '').toLowerCase();
    case 'estabilidad':
      return getStockStabilityMeta(materia, stock).rank;
    case 'stock':
      return stock;
    case 'costo':
      return materia.costo ?? 0;
    case 'fecha_actualizacion':
      return materia.fecha_actualizacion ?? '';
    default:
      return (materia.nombre ?? '').toLowerCase();
  }
}

export function sortMaterias(
  materias: MateriaPrima[],
  field: MateriaPrimaSortField,
  direction: SortDirection,
  getStockLevel: GetStockLevel
) {
  return [...materias].sort((left, right) => {
    const leftStock = getStockLevel(left.id);
    const rightStock = getStockLevel(right.id);
    const leftValue = getSortValue(left, field, leftStock);
    const rightValue = getSortValue(right, field, rightStock);

    // Dentro de un mismo nivel de estabilidad se desempata por stock y luego por nombre.
    if (field === 'estabilidad' && leftValue === rightValue) {
      if (leftStock !== rightStock) return direction === 'asc' ? leftStock - rightStock : rightStock - leftStock;

      return direction === 'asc' ? left.nombre.localeCompare(right.nombre) : right.nombre.localeCompare(left.nombre);
    }

    return compareSortValues(leftValue, rightValue, direction);
  });
}

/** Exporta el catalogo visible junto con su stock y umbrales de estabilidad. */
export function buildMateriasSheets(materias: MateriaPrima[], getStockLevel: GetStockLevel) {
  return [
    buildSheet({
      name: 'Materias primas',
      rows: materias,
      columns: [
        { header: 'Material', value: materia => materia.nombre },
        { header: 'Unidad', value: materia => materia.unidad_medida?.nombre },
        { header: 'Abreviatura', value: materia => materia.unidad_medida?.abreviatura },
        { header: 'Costo unitario', value: materia => materia.costo ?? 0, format: EXCEL_FORMATS.money },
        { header: 'Stock actual', value: materia => getStockLevel(materia.id), format: EXCEL_FORMATS.decimal },
        { header: 'Estabilidad', value: materia => getStockStabilityMeta(materia, getStockLevel(materia.id)).label },
        {
          header: 'Stock crítico hasta',
          value: materia => getMateriaPrimaStabilityThresholds(materia).stock_critico_max,
          format: EXCEL_FORMATS.decimal,
        },
        {
          header: 'Stock bajo hasta',
          value: materia => getMateriaPrimaStabilityThresholds(materia).stock_bajo_max,
          format: EXCEL_FORMATS.decimal,
        },
        { header: 'Última actualización', value: materia => toExcelDate(materia.fecha_actualizacion) },
      ],
    }),
  ];
}
