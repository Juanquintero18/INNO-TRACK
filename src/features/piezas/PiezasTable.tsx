/**
 * Tabla de piezas con su costo calculado y estado.
 */
import { Eye } from 'lucide-react';
import { DeleteButton, EditButton } from '@/components/data/RowActions';
import { SortableHeader } from '@/components/data/SortableHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatFecha } from '@/lib/dates';
import { calcularCostoPieza } from '@/lib/domain-utils';
import type { SortDirection } from '@/lib/sorting';
import type { Pieza } from '@/lib/types';
import { getEstadoPieza, type PiezaSortField } from './piezas-list';

const EMPTY = '—';

interface PiezasTableProps {
  piezas: Pieza[];
  canManage: boolean;
  sortField: PiezaSortField;
  sortDirection: SortDirection;
  onSort: (field: PiezaSortField) => void;
  onView: (pieza: Pieza) => void;
  onEdit: (pieza: Pieza) => void;
  onDelete: (pieza: Pieza) => void;
}

export function PiezasTable({
  piezas,
  canManage,
  sortField,
  sortDirection,
  onSort,
  onView,
  onEdit,
  onDelete,
}: PiezasTableProps) {
  const sortableHeader = (label: string, field: PiezaSortField, alignRight = false) => (
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
          <TableHead>{sortableHeader('Trace ID', 'trace_id')}</TableHead>
          <TableHead>{sortableHeader('Nombre', 'nombre')}</TableHead>
          <TableHead>{sortableHeader('Proyecto', 'proyecto')}</TableHead>
          <TableHead>{sortableHeader('Orden', 'orden')}</TableHead>
          <TableHead>{sortableHeader('Fecha Gelcoat', 'fecha_gelcoat')}</TableHead>
          <TableHead className="text-primary">{sortableHeader('Fecha QC', 'fecha_qc')}</TableHead>
          <TableHead>{sortableHeader('Peso Real', 'peso_real')}</TableHead>
          <TableHead className="text-right">{sortableHeader('Costo Total', 'costo', true)}</TableHead>
          <TableHead>{sortableHeader('Estado', 'estado')}</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {piezas.map(pieza => (
          <TableRow key={pieza.id}>
            <TableCell className="font-mono text-sm font-medium text-primary">{pieza.trace_id || EMPTY}</TableCell>

            <TableCell className="font-medium">{pieza.nombre || EMPTY}</TableCell>

            <TableCell className="text-muted-foreground">{pieza.orden?.proyecto?.nombre || EMPTY}</TableCell>

            <TableCell className="font-mono text-muted-foreground">{pieza.orden?.codigo_orden || EMPTY}</TableCell>

            <TableCell className="text-muted-foreground">{formatFecha(pieza.fecha_gelcoat)}</TableCell>
            <TableCell className="text-muted-foreground">{formatFecha(pieza.fecha_qc)}</TableCell>
            <TableCell>{pieza.peso_real ? `${pieza.peso_real} kg` : EMPTY}</TableCell>
            <TableCell className="text-right font-semibold">${calcularCostoPieza(pieza).toFixed(2)}</TableCell>

            <TableCell>
              <Badge variant={pieza.fecha_qc ? 'default' : 'secondary'}>{getEstadoPieza(pieza)}</Badge>
            </TableCell>

            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="icon" onClick={() => onView(pieza)} title="Ver detalle">
                  <Eye className="w-4 h-4" />
                </Button>

                {canManage && (
                  <>
                    <EditButton onClick={() => onEdit(pieza)} />
                    <DeleteButton onClick={() => onDelete(pieza)} />
                  </>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
