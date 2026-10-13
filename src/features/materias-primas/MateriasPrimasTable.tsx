/**
 * Tabla del catálogo de materias primas con stock y semáforo de estabilidad.
 */
import { Activity, ShieldAlert, ShieldCheck } from 'lucide-react';
import { RowActions } from '@/components/data/RowActions';
import { SortableHeader } from '@/components/data/SortableHeader';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatFecha } from '@/lib/dates';
import { getStockStabilityMeta, type StockStabilityState } from '@/lib/domain-utils';
import type { SortDirection } from '@/lib/sorting';
import type { MateriaPrima } from '@/lib/types';

export type MateriaPrimaSortField = 'nombre' | 'unidad' | 'costo' | 'stock' | 'estabilidad' | 'fecha_actualizacion';

const STABILITY_ICONS: Record<StockStabilityState, typeof ShieldAlert> = {
  critico: ShieldAlert,
  bajo: Activity,
  estable: ShieldCheck,
};

interface MateriasPrimasTableProps {
  materias: MateriaPrima[];
  getStockLevel: (materiaId: number) => number;
  canManage: boolean;
  sortField: MateriaPrimaSortField;
  sortDirection: SortDirection;
  onSort: (field: MateriaPrimaSortField) => void;
  onConfigureStability: (materia: MateriaPrima) => void;
  onEdit: (materia: MateriaPrima) => void;
  onDelete: (materia: MateriaPrima) => void;
}

export function MateriasPrimasTable({
  materias,
  getStockLevel,
  canManage,
  sortField,
  sortDirection,
  onSort,
  onConfigureStability,
  onEdit,
  onDelete,
}: MateriasPrimasTableProps) {
  const sortableHeader = (label: string, field: MateriaPrimaSortField, alignRight = false) => (
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
          <TableHead>{sortableHeader('Material', 'nombre')}</TableHead>
          <TableHead>{sortableHeader('Unidad', 'unidad')}</TableHead>
          <TableHead className="text-right">{sortableHeader('Costo Unitario', 'costo', true)}</TableHead>
          <TableHead className="text-right">{sortableHeader('Stock Actual', 'stock', true)}</TableHead>
          <TableHead>{sortableHeader('Estabilidad', 'estabilidad')}</TableHead>
          <TableHead>{sortableHeader('Última Actualización', 'fecha_actualizacion')}</TableHead>
          {canManage && <TableHead className="text-right">Acciones</TableHead>}
        </TableRow>
      </TableHeader>

      <TableBody>
        {materias.map(materia => {
          const stock = getStockLevel(materia.id);
          const stability = getStockStabilityMeta(materia, stock);
          const StabilityIcon = STABILITY_ICONS[stability.state];

          return (
            <TableRow key={materia.id}>
              <TableCell className="font-medium">{materia.nombre}</TableCell>

              <TableCell className="text-muted-foreground">
                {materia.unidad_medida?.nombre} ({materia.unidad_medida?.abreviatura})
              </TableCell>

              <TableCell className="text-right font-semibold">${(materia.costo ?? 0).toFixed(2)}</TableCell>

              <TableCell className="text-right">
                <span className={stability.state === 'critico' ? 'text-destructive font-semibold' : ''}>
                  {stock.toFixed(1)} {materia.unidad_medida?.abreviatura}
                </span>
              </TableCell>

              <TableCell>
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onConfigureStability(materia)}
                    disabled={!canManage}
                    className={`h-auto min-w-[170px] justify-start gap-3 px-3 py-2 ${stability.buttonClass}`}
                  >
                    <StabilityIcon className="h-4 w-4" />
                    <span className="flex flex-col items-start leading-tight">
                      <span className="text-xs font-semibold uppercase tracking-wide">Semáforo</span>
                      <span className="text-sm font-semibold">{stability.label}</span>
                    </span>
                  </Button>
                  <p className="text-xs text-muted-foreground">{stability.helperText}</p>
                </div>
              </TableCell>

              <TableCell className="text-muted-foreground">{formatFecha(materia.fecha_actualizacion)}</TableCell>

              {canManage && (
                <TableCell className="text-right">
                  <RowActions onEdit={() => onEdit(materia)} onDelete={() => onDelete(materia)} />
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
