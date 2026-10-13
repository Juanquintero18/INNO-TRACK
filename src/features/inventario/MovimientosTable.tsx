/**
 * Tabla de movimientos de inventario.
 */
import { RowActions } from '@/components/data/RowActions';
import { SortableHeader } from '@/components/data/SortableHeader';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatFecha } from '@/lib/dates';
import type { SortDirection } from '@/lib/sorting';
import type { MovimientoInventario } from '@/lib/types';
import type { MovimientoSortField } from './movimientos-list';

const TIPO_BADGE_VARIANTS = {
  entrada: 'default',
  salida: 'destructive',
  ajuste: 'secondary',
} as const;

interface MovimientosTableProps {
  movimientos: MovimientoInventario[];
  canManage: boolean;
  sortField: MovimientoSortField;
  sortDirection: SortDirection;
  onSort: (field: MovimientoSortField) => void;
  onEdit: (movimiento: MovimientoInventario) => void;
  onDelete: (movimiento: MovimientoInventario) => void;
}

export function MovimientosTable({
  movimientos,
  canManage,
  sortField,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
}: MovimientosTableProps) {
  const sortableHeader = (label: string, field: MovimientoSortField, alignRight = false) => (
    <SortableHeader
      label={label}
      active={sortField === field}
      direction={sortDirection}
      onSort={() => onSort(field)}
      alignRight={alignRight}
    />
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{sortableHeader('Fecha', 'fecha')}</TableHead>
          <TableHead>{sortableHeader('Tipo', 'tipo')}</TableHead>
          <TableHead>{sortableHeader('Material', 'material')}</TableHead>
          <TableHead className="text-right">{sortableHeader('Cantidad', 'cantidad', true)}</TableHead>
          <TableHead>{sortableHeader('Proveedor / Trabajador', 'responsable')}</TableHead>
          <TableHead>{sortableHeader('Motivo', 'motivo')}</TableHead>
          <TableHead>{sortableHeader('Referencia', 'referencia')}</TableHead>
          {canManage && <TableHead className="text-right">Acciones</TableHead>}
        </TableRow>
      </TableHeader>

      <TableBody>
        {movimientos.map(movimiento => (
          <TableRow key={movimiento.id}>
            <TableCell className="text-muted-foreground">{formatFecha(movimiento.fecha)}</TableCell>

            <TableCell>
              <Badge variant={TIPO_BADGE_VARIANTS[movimiento.tipo] ?? 'secondary'}>{movimiento.tipo}</Badge>
            </TableCell>

            <TableCell className="font-medium">{movimiento.materia_prima?.nombre}</TableCell>

            <TableCell className="text-right font-semibold">
              {movimiento.tipo === 'salida' ? '-' : ''}
              {movimiento.cantidad} {movimiento.materia_prima?.unidad_medida?.abreviatura}
            </TableCell>

            <TableCell className="text-muted-foreground">
              {movimiento.proveedor?.nombre || movimiento.trabajador?.nombre || '—'}
            </TableCell>

            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
              {movimiento.motivo || '—'}
            </TableCell>

            <TableCell className="font-mono text-xs">{movimiento.referencia || '—'}</TableCell>

            {canManage && (
              <TableCell className="text-right">
                <RowActions onEdit={() => onEdit(movimiento)} onDelete={() => onDelete(movimiento)} />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
