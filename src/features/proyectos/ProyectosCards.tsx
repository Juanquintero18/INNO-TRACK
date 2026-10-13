/**
 * Tarjetas del módulo de proyectos: listado de proyectos, órdenes del
 * proyecto seleccionado y resumen del proyecto.
 */
import type { ReactNode } from 'react';
import { ListOrdered } from 'lucide-react';
import { DeleteButton, EditButton } from '@/components/data/RowActions';
import { SearchInput } from '@/components/data/SearchInput';
import { SortableHeader } from '@/components/data/SortableHeader';
import type { SelectOption } from '@/components/form/FormParts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatFecha } from '@/lib/dates';
import type { SortDirection } from '@/lib/sorting';
import type { Orden, Proyecto } from '@/lib/types';
import {
  EMPTY_FILTERS,
  TODOS_LOS_ESTADOS,
  formatStatusLabel,
  normalizeStatus,
  orderStatusOptions,
  projectStatusOptions,
  sortOrdenesByFechaDesc,
  type CountById,
  type ListFilters,
  type OrdenSortField,
  type ProyectoSortField,
} from './proyectos-utils';

const EMPTY = '—';

interface SortState<Field> {
  field: Field;
  direction: SortDirection;
  onSort: (field: Field) => void;
}

interface FiltersRowProps {
  /** Prefijo de los `id` de las fechas, para que cada tarjeta tenga los suyos. */
  idPrefix: string;
  filters: ListFilters;
  onChange: (filters: ListFilters) => void;
  statusOptions: SelectOption[];
  fromLabel: string;
  toLabel: string;
  disabled?: boolean;
}

/** Fila de filtros de una tarjeta: estado, rango de fechas y botón para limpiarlos. */
function FiltersRow({ idPrefix, filters, onChange, statusOptions, fromLabel, toLabel, disabled }: FiltersRowProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Estado</Label>
        <Select value={filters.status} onValueChange={status => onChange({ ...filters, status })} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS_LOS_ESTADOS}>Todos los estados</SelectItem>
            {statusOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-filter-from`} className="text-xs text-muted-foreground">
          {fromLabel}
        </Label>
        <Input
          id={`${idPrefix}-filter-from`}
          type="date"
          value={filters.from}
          onChange={e => onChange({ ...filters, from: e.target.value })}
          disabled={disabled}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-filter-to`} className="text-xs text-muted-foreground">
          {toLabel}
        </Label>
        <Input
          id={`${idPrefix}-filter-to`}
          type="date"
          min={filters.from || undefined}
          value={filters.to}
          onChange={e => onChange({ ...filters, to: e.target.value })}
          disabled={disabled}
        />
      </div>

      <div className="flex items-end">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={disabled}
          onClick={() => onChange(EMPTY_FILTERS)}
        >
          Limpiar filtros
        </Button>
      </div>
    </div>
  );
}

function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-8">
        {children}
      </TableCell>
    </TableRow>
  );
}

interface ProyectosCardProps {
  proyectos: Proyecto[];
  selectedProyectoId: number | null;
  onSelect: (proyectoId: number) => void;
  orderCountByProjectId: CountById;
  filters: ListFilters;
  onFiltersChange: (filters: ListFilters) => void;
  sort: SortState<ProyectoSortField>;
  onEdit: (proyecto: Proyecto) => void;
  onDelete: (proyecto: Proyecto) => void;
}

export function ProyectosCard({
  proyectos,
  selectedProyectoId,
  onSelect,
  orderCountByProjectId,
  filters,
  onFiltersChange,
  sort,
  onEdit,
  onDelete,
}: ProyectosCardProps) {
  const sortableHeader = (label: string, field: ProyectoSortField) => (
    <SortableHeader
      label={label}
      active={sort.field === field}
      direction={sort.direction}
      onSort={() => sort.onSort(field)}
      showDirection={false}
    />
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="font-semibold text-foreground">Proyectos registrados</p>
            <SearchInput
              placeholder="Buscar proyecto por nombre, codigo o estado..."
              value={filters.search}
              onChange={search => onFiltersChange({ ...filters, search })}
              className="w-full md:max-w-sm"
            />
          </div>

          <FiltersRow
            idPrefix="project"
            filters={filters}
            onChange={onFiltersChange}
            statusOptions={projectStatusOptions}
            fromLabel="Inicio desde"
            toLabel="Inicio hasta"
          />
        </div>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{sortableHeader('Codigo', 'codigo')}</TableHead>
              <TableHead>{sortableHeader('Nombre', 'nombre')}</TableHead>
              <TableHead>{sortableHeader('Estado', 'estado')}</TableHead>
              <TableHead>{sortableHeader('Inicio', 'fecha_inicio')}</TableHead>
              <TableHead className="text-right">{sortableHeader('Ordenes', 'total_ordenes')}</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {proyectos.map(proyecto => (
              <TableRow
                key={proyecto.id}
                className={selectedProyectoId === proyecto.id ? 'bg-primary/5' : ''}
                onClick={() => onSelect(proyecto.id)}
              >
                <TableCell className="font-mono text-muted-foreground">{proyecto.codigo || EMPTY}</TableCell>
                <TableCell className="font-medium">{proyecto.nombre || EMPTY}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{formatStatusLabel(proyecto.estado)}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatFecha(proyecto.fecha_inicio)}</TableCell>
                <TableCell className="text-right font-semibold">{orderCountByProjectId.get(proyecto.id) ?? 0}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {/* El clic en una acción no debe además seleccionar la fila. */}
                    <EditButton
                      type="button"
                      title="Editar proyecto"
                      onClick={event => {
                        event.stopPropagation();
                        onEdit(proyecto);
                      }}
                    />
                    <DeleteButton
                      type="button"
                      title="Eliminar proyecto"
                      onClick={event => {
                        event.stopPropagation();
                        onDelete(proyecto);
                      }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {proyectos.length === 0 && (
              <EmptyRow colSpan={6}>No hay proyectos que coincidan con la busqueda actual.</EmptyRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

interface OrdenesCardProps {
  /** Proyecto cuyas órdenes se muestran; sin proyecto la tarjeta queda deshabilitada. */
  proyecto: Proyecto | null;
  ordenes: Orden[];
  pieceCountByOrderId: CountById;
  filters: ListFilters;
  onFiltersChange: (filters: ListFilters) => void;
  sort: SortState<OrdenSortField>;
  onEdit: (orden: Orden) => void;
  onDelete: (orden: Orden) => void;
}

export function OrdenesCard({
  proyecto,
  ordenes,
  pieceCountByOrderId,
  filters,
  onFiltersChange,
  sort,
  onEdit,
  onDelete,
}: OrdenesCardProps) {
  const sortableHeader = (label: string, field: OrdenSortField) => (
    <SortableHeader
      label={label}
      active={sort.field === field}
      direction={sort.direction}
      onSort={() => sort.onSort(field)}
      showDirection={false}
    />
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-foreground flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-primary" />
                Ordenes del proyecto
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {proyecto
                  ? `${proyecto.nombre || 'Proyecto sin nombre'} (${proyecto.codigo || `ID ${proyecto.id}`})`
                  : 'Selecciona un proyecto para ver sus ordenes.'}
              </p>
            </div>

            <SearchInput
              placeholder="Buscar orden por codigo o estado..."
              value={filters.search}
              onChange={search => onFiltersChange({ ...filters, search })}
              className="w-full md:max-w-sm"
              disabled={!proyecto}
            />
          </div>

          <FiltersRow
            idPrefix="order"
            filters={filters}
            onChange={onFiltersChange}
            statusOptions={orderStatusOptions}
            fromLabel="Creación desde"
            toLabel="Creación hasta"
            disabled={!proyecto}
          />
        </div>
      </CardHeader>

      <CardContent>
        {!proyecto ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
            Aun no hay un proyecto seleccionado.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{sortableHeader('Codigo', 'codigo_orden')}</TableHead>
                <TableHead>{sortableHeader('Fecha', 'fecha_creacion')}</TableHead>
                <TableHead>{sortableHeader('Estado', 'estado')}</TableHead>
                <TableHead className="text-right">{sortableHeader('Piezas', 'total_piezas')}</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {ordenes.map(orden => (
                <TableRow key={orden.id}>
                  <TableCell className="font-mono text-primary font-medium">{orden.codigo_orden || EMPTY}</TableCell>
                  <TableCell className="text-muted-foreground">{formatFecha(orden.fecha_creacion)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{formatStatusLabel(orden.estado)}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{pieceCountByOrderId.get(orden.id) ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <EditButton type="button" title="Editar orden" onClick={() => onEdit(orden)} />
                      <DeleteButton type="button" title="Eliminar orden" onClick={() => onDelete(orden)} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {ordenes.length === 0 && <EmptyRow colSpan={5}>Este proyecto aun no tiene ordenes registradas.</EmptyRow>}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, children, className, valueClassName }: { label: string; children: ReactNode; className: string; valueClassName: string }) {
  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={valueClassName}>{children}</p>
    </div>
  );
}

interface ProyectoDetailCardProps {
  proyecto: Proyecto | null;
  /** Todas las órdenes del proyecto, sin los filtros de la tabla de órdenes. */
  ordenes: Orden[];
  pieceCountByOrderId: CountById;
}

/** Resumen ejecutivo del proyecto seleccionado con sus órdenes y piezas asociadas. */
export function ProyectoDetailCard({ proyecto, ordenes, pieceCountByOrderId }: ProyectoDetailCardProps) {
  const fechas = ordenes.map(orden => orden.fecha_creacion).filter((fecha): fecha is string => Boolean(fecha));
  const primeraOrden = fechas.reduce((min, fecha) => (!min || fecha < min ? fecha : min), '');
  const ultimaOrden = fechas.reduce((max, fecha) => (!max || fecha > max ? fecha : max), '');
  const totalPiezas = ordenes.reduce((total, orden) => total + (pieceCountByOrderId.get(orden.id) ?? 0), 0);

  const ordenesPorEstado = new Map<string, number>();
  for (const orden of ordenes) {
    const estado = normalizeStatus(orden.estado) || 'sin_estado';
    ordenesPorEstado.set(estado, (ordenesPorEstado.get(estado) ?? 0) + 1);
  }

  const infoClass = 'rounded-lg border bg-muted/20 p-4';
  const infoValueClass = 'mt-1 text-base font-semibold text-foreground';
  const metricClass = 'rounded-lg border p-4';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-foreground">Detalle del proyecto</p>
          <p className="text-sm text-muted-foreground">
            Resumen ejecutivo del proyecto seleccionado con sus órdenes y piezas asociadas.
          </p>
        </div>
      </CardHeader>

      <CardContent>
        {!proyecto ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
            Selecciona un proyecto para visualizar su detalle y métricas.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Metric label="Código" className={infoClass} valueClassName={infoValueClass}>
                {proyecto.codigo || 'Sin código'}
              </Metric>
              <Metric label="Estado" className={infoClass} valueClassName={infoValueClass}>
                {formatStatusLabel(proyecto.estado)}
              </Metric>
              <Metric label="Fecha inicio" className={infoClass} valueClassName={infoValueClass}>
                {formatFecha(proyecto.fecha_inicio)}
              </Metric>
              <Metric label="Fecha fin" className={infoClass} valueClassName={infoValueClass}>
                {formatFecha(proyecto.fecha_fin)}
              </Metric>
            </div>

            <Metric
              label="Descripción"
              className="rounded-lg border bg-background p-4"
              valueClassName="mt-2 text-sm text-foreground whitespace-pre-wrap"
            >
              {proyecto.descripcion || 'Sin descripción registrada.'}
            </Metric>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Metric label="Órdenes totales" className={metricClass} valueClassName="mt-1 text-2xl font-bold text-foreground">
                {ordenes.length}
              </Metric>
              <Metric label="Piezas totales" className={metricClass} valueClassName="mt-1 text-2xl font-bold text-foreground">
                {totalPiezas}
              </Metric>
              <Metric label="Primera orden" className={metricClass} valueClassName="mt-1 text-sm font-semibold text-foreground">
                {formatFecha(primeraOrden || null)}
              </Metric>
              <Metric label="Última orden" className={metricClass} valueClassName="mt-1 text-sm font-semibold text-foreground">
                {formatFecha(ultimaOrden || null)}
              </Metric>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Distribución de órdenes por estado</p>
              <div className="flex flex-wrap gap-2">
                {ordenesPorEstado.size > 0 ? (
                  Array.from(ordenesPorEstado.entries()).map(([estado, count]) => (
                    <Badge key={estado} variant="secondary">
                      {formatStatusLabel(estado)}: {count}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline">Sin órdenes registradas</Badge>
                )}
              </div>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Orden</TableHead>
                    <TableHead>Fecha creación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Piezas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordenes.length > 0 ? (
                    sortOrdenesByFechaDesc(ordenes).map(orden => (
                      <TableRow key={orden.id}>
                        <TableCell className="font-mono text-primary font-medium">
                          {orden.codigo_orden || `Orden #${orden.id}`}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatFecha(orden.fecha_creacion)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatStatusLabel(orden.estado)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{pieceCountByOrderId.get(orden.id) ?? 0}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <EmptyRow colSpan={4}>Este proyecto no tiene órdenes registradas.</EmptyRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
