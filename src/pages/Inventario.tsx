/**
 * Pantalla de movimientos de inventario.
 *
 * Reune consulta, filtros, ordenamiento y formulario para registrar entradas,
 * salidas y ajustes de materias primas dentro del sistema.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, Info, Plus, Upload } from 'lucide-react';
import { ExportExcelButton } from '@/components/ExportExcelButton';
import { DateRangeFilter } from '@/components/data/DateRangeFilter';
import { SearchInput } from '@/components/data/SearchInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppData } from '@/contexts/AppDataContext';
import { ImportMovimientosDialog } from '@/features/inventario/ImportMovimientosDialog';
import { MovimientoFormDialog } from '@/features/inventario/MovimientoFormDialog';
import { MovimientosTable } from '@/features/inventario/MovimientosTable';
import {
  TODOS_LOS_TIPOS,
  buildMovimientosSheets,
  filterMovimientos,
  sortMovimientos,
  type MovimientoSortField,
} from '@/features/inventario/movimientos-list';
import { useMovimientoForm } from '@/features/inventario/useMovimientoForm';
import { useMovimientosImport } from '@/features/inventario/useMovimientosImport';
import { useModulePermission } from '@/hooks/useModulePermission';
import { useSort } from '@/hooks/useSort';
import type { MovimientoInventario } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';

/** Orquesta la gestion visual de movimientos y su sincronizacion con la API. */
export default function Inventario() {
  const { movimientosList, deleteEntity } = useAppData();
  const { canManage, showPermissionDenied } = useModulePermission('inventario');
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState(TODOS_LOS_TIPOS);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const { sortField, sortDirection, toggleSort } = useSort<MovimientoSortField>('fecha');
  const movimientoForm = useMovimientoForm();
  const importer = useMovimientosImport();

  const filtered = filterMovimientos(movimientosList, { search, tipo: tipoFilter, fechaInicio, fechaFin });
  const sorted = sortMovimientos(filtered, sortField, sortDirection);

  const handleDelete = async (movimiento: MovimientoInventario) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    if (!window.confirm(`¿Eliminar el movimiento ${movimiento.referencia || movimiento.id}?`)) return;

    try {
      await deleteEntity('movimiento-inventario', movimiento);
    } catch (error) {
      window.alert(getErrorMessage(error, 'No se pudo eliminar el movimiento.'));
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-primary" /> Movimientos de Inventario
          </h1>
          <p className="text-muted-foreground mt-1">Registro de entradas, salidas y ajustes</p>
        </div>

        <DateRangeFilter from={fechaInicio} to={fechaFin} onFromChange={setFechaInicio} onToChange={setFechaFin} />

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <ExportExcelButton fileName="movimientos_inventario" getSheets={() => buildMovimientosSheets(sorted)} />

          {canManage && (
            <>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                      aria-label="Recomendaciones para importar Excel"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="border-emerald-100 bg-emerald-50/90">
                    <p className="text-sm leading-6 text-emerald-950">
                      El Excel debe venir claro, con encabezados consistentes, una fila por movimiento y datos limpios para evitar errores al importar.
                    </p>
                  </PopoverContent>
                </Popover>

                <Button type="button" onClick={importer.open} className="bg-emerald-600 text-white hover:bg-emerald-700">
                  <Upload className="w-4 h-4 mr-2" />
                  Importar Excel
                </Button>
              </div>

              <Button type="button" onClick={movimientoForm.open}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo registro
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <SearchInput
              placeholder="Buscar por material, referencia..."
              value={search}
              onChange={setSearch}
              className="flex-1 max-w-sm"
            />

            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS_LOS_TIPOS}>Todos</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="salida">Salida</SelectItem>
                <SelectItem value="ajuste">Ajuste</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <MovimientosTable
            movimientos={sorted}
            canManage={canManage}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={toggleSort}
            onEdit={movimientoForm.openEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <ImportMovimientosDialog importer={importer} />
      <MovimientoFormDialog form={movimientoForm} />
    </motion.div>
  );
}
