/**
 * Pantalla de gestion de materias primas.
 *
 * Reune consulta, ordenamiento, filtros por fecha y el formulario de creacion
 * o edicion de cada material del inventario.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus } from 'lucide-react';
import { ExportExcelButton } from '@/components/ExportExcelButton';
import { DateRangeFilter } from '@/components/data/DateRangeFilter';
import { SearchInput } from '@/components/data/SearchInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAppData } from '@/contexts/AppDataContext';
import { MateriaPrimaFormDialog, StabilityConfigDialog } from '@/features/materias-primas/MateriaPrimaDialogs';
import { MateriasPrimasTable, type MateriaPrimaSortField } from '@/features/materias-primas/MateriasPrimasTable';
import { buildMateriasSheets, filterMaterias, sortMaterias } from '@/features/materias-primas/materias-list';
import { useMateriaPrimaForm } from '@/features/materias-primas/useMateriaPrimaForm';
import { useStabilityForm } from '@/features/materias-primas/useStabilityForm';
import { useModulePermission } from '@/hooks/useModulePermission';
import { useSort } from '@/hooks/useSort';
import type { MateriaPrima } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';

/** Administra el CRUD visual de materias primas y su lectura operativa. */
export default function MateriasPrimas() {
  const { materiasList, deleteEntity, getStockLevel } = useAppData();
  const { canManage, showPermissionDenied } = useModulePermission('materias-primas');
  const [search, setSearch] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const { sortField, sortDirection, toggleSort, setSort } = useSort<MateriaPrimaSortField>('nombre');
  const materiaForm = useMateriaPrimaForm();
  const stabilityForm = useStabilityForm();

  const filtered = filterMaterias(materiasList, { search, fechaInicio, fechaFin });
  const sorted = sortMaterias(filtered, sortField, sortDirection, getStockLevel);

  const handleDelete = async (materia: MateriaPrima) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    if (!window.confirm(`¿Eliminar la materia prima ${materia.nombre}?`)) return;

    try {
      await deleteEntity('materia-prima', materia);
    } catch (error) {
      window.alert(getErrorMessage(error, 'No se pudo eliminar la materia prima.'));
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" /> Materias Primas
          </h1>
          <p className="text-muted-foreground mt-1">Catálogo de materiales y costos</p>
        </div>

        <DateRangeFilter from={fechaInicio} to={fechaFin} onFromChange={setFechaInicio} onToChange={setFechaFin} />

        <div className="flex flex-wrap items-center justify-end gap-2">
          <ExportExcelButton fileName="materias_primas" getSheets={() => buildMateriasSheets(sorted, getStockLevel)} />

          {canManage && (
            <Button type="button" onClick={materiaForm.open}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo registro
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SearchInput
              placeholder="Buscar material..."
              value={search}
              onChange={setSearch}
              className="max-w-sm flex-1"
            />

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Vista rápida:</span>
              <Button
                type="button"
                size="sm"
                variant={sortField === 'estabilidad' ? 'default' : 'outline'}
                onClick={() => setSort('estabilidad', 'asc')}
              >
                Priorizar críticos
              </Button>
              <Button
                type="button"
                size="sm"
                variant={sortField === 'nombre' ? 'default' : 'outline'}
                onClick={() => setSort('nombre', 'asc')}
              >
                Orden alfabético
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <MateriasPrimasTable
            materias={sorted}
            getStockLevel={getStockLevel}
            canManage={canManage}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={toggleSort}
            onConfigureStability={stabilityForm.openFor}
            onEdit={materiaForm.openEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <StabilityConfigDialog form={stabilityForm} />
      <MateriaPrimaFormDialog form={materiaForm} />
    </motion.div>
  );
}
