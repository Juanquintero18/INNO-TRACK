/**
 * Reglas de proyectos y órdenes: estados, filtros, orden y hojas de exportación.
 */
import type { SelectOption } from '@/components/form/FormParts';
import { isWithinDateRange } from '@/lib/dates';
import { buildSheet, toExcelDate } from '@/lib/excel-export';
import { sortRows, textSortValue, type SortDirection } from '@/lib/sorting';
import type { Orden, Proyecto } from '@/lib/types';

export type ProyectoSortField = 'codigo' | 'nombre' | 'estado' | 'fecha_inicio' | 'total_ordenes';
export type OrdenSortField = 'codigo_orden' | 'fecha_creacion' | 'estado' | 'total_piezas';

/** Valor del filtro de estado que no descarta ningún registro. */
export const TODOS_LOS_ESTADOS = 'all';

export const projectStatusOptions: SelectOption[] = [
  { value: 'planeacion', label: 'Planeacion' },
  { value: 'activo', label: 'Activo' },
  { value: 'pausado', label: 'Pausado' },
  { value: 'finalizado', label: 'Finalizado' },
];

export const orderStatusOptions: SelectOption[] = [
  { value: 'abierta', label: 'Abierta' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'cerrada', label: 'Cerrada' },
  { value: 'cancelada', label: 'Cancelada' },
];

export const normalizeStatus = (value?: string | null) => (value ?? '').trim().toLowerCase();

/** Convierte un estado técnico como `en_proceso` en "En Proceso". */
export function formatStatusLabel(value?: string | null) {
  if (!value) return 'Sin estado';

  return value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
}

/** Cantidad de registros hijos por cada padre (órdenes por proyecto, piezas por orden). */
export type CountById = Map<number, number>;

export interface ListFilters {
  search: string;
  status: string;
  from: string;
  to: string;
}

export const EMPTY_FILTERS: ListFilters = { search: '', status: TODOS_LOS_ESTADOS, from: '', to: '' };

export function filterProyectos(proyectos: Proyecto[], { search, status, from, to }: ListFilters) {
  const term = search.toLowerCase();

  return proyectos.filter(proyecto => {
    const statusMatches = status === TODOS_LOS_ESTADOS || normalizeStatus(proyecto.estado) === status;
    const searchMatches =
      (proyecto.nombre ?? '').toLowerCase().includes(term) ||
      (proyecto.codigo ?? '').toLowerCase().includes(term) ||
      (proyecto.estado ?? '').toLowerCase().includes(term);

    return searchMatches && statusMatches && isWithinDateRange(proyecto.fecha_inicio, from, to);
  });
}

export function sortProyectos(
  proyectos: Proyecto[],
  field: ProyectoSortField,
  direction: SortDirection,
  orderCountByProjectId: CountById
) {
  return sortRows(
    proyectos,
    proyecto => (field === 'total_ordenes' ? orderCountByProjectId.get(proyecto.id) ?? 0 : textSortValue(proyecto[field])),
    direction
  );
}

/** Órdenes de un proyecto que cumplen los filtros de la tabla de órdenes. */
export function filterOrdenes(ordenes: Orden[], proyectoId: number | null, { search, status, from, to }: ListFilters) {
  const term = search.toLowerCase();

  return ordenes.filter(orden => {
    if (!proyectoId || orden.proyecto_id !== proyectoId) return false;

    const statusMatches = status === TODOS_LOS_ESTADOS || normalizeStatus(orden.estado) === status;
    const searchMatches =
      (orden.codigo_orden ?? '').toLowerCase().includes(term) || (orden.estado ?? '').toLowerCase().includes(term);

    return searchMatches && statusMatches && isWithinDateRange(orden.fecha_creacion, from, to);
  });
}

export function sortOrdenes(
  ordenes: Orden[],
  field: OrdenSortField,
  direction: SortDirection,
  pieceCountByOrderId: CountById
) {
  return sortRows(
    ordenes,
    orden => (field === 'total_piezas' ? pieceCountByOrderId.get(orden.id) ?? 0 : textSortValue(orden[field])),
    direction
  );
}

/** Órdenes de la más reciente a la más antigua. */
export const sortOrdenesByFechaDesc = (ordenes: Orden[]) =>
  [...ordenes].sort((left, right) => (right.fecha_creacion ?? '').localeCompare(left.fecha_creacion ?? ''));

/**
 * Exporta los proyectos visibles y, en una segunda hoja, todas sus ordenes
 * (no solo las del proyecto seleccionado en pantalla).
 */
export function buildProyectosSheets(
  proyectos: Proyecto[],
  ordenes: Orden[],
  orderCountByProjectId: CountById,
  pieceCountByOrderId: CountById
) {
  return [
    buildSheet({
      name: 'Proyectos',
      rows: proyectos,
      columns: [
        { header: 'Código', value: proyecto => proyecto.codigo },
        { header: 'Nombre', value: proyecto => proyecto.nombre },
        { header: 'Descripción', value: proyecto => proyecto.descripcion },
        { header: 'Estado', value: proyecto => formatStatusLabel(proyecto.estado) },
        { header: 'Fecha inicio', value: proyecto => toExcelDate(proyecto.fecha_inicio) },
        { header: 'Fecha fin', value: proyecto => toExcelDate(proyecto.fecha_fin) },
        { header: 'Órdenes', value: proyecto => orderCountByProjectId.get(proyecto.id) ?? 0 },
      ],
    }),
    buildSheet({
      name: 'Órdenes',
      rows: proyectos.flatMap(proyecto =>
        sortOrdenesByFechaDesc(ordenes.filter(orden => orden.proyecto_id === proyecto.id)).map(orden => ({
          proyecto,
          orden,
        }))
      ),
      columns: [
        { header: 'Código proyecto', value: ({ proyecto }) => proyecto.codigo },
        { header: 'Proyecto', value: ({ proyecto }) => proyecto.nombre },
        { header: 'Código orden', value: ({ orden }) => orden.codigo_orden },
        { header: 'Fecha creación', value: ({ orden }) => toExcelDate(orden.fecha_creacion) },
        { header: 'Estado', value: ({ orden }) => formatStatusLabel(orden.estado) },
        { header: 'Piezas', value: ({ orden }) => pieceCountByOrderId.get(orden.id) ?? 0 },
      ],
    }),
  ];
}
