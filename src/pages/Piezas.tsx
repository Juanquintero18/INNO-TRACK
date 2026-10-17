/**
 * Pantalla de piezas fabricadas.
 *
 * Es el modulo mas completo del frontend: consulta piezas, registra materiales
 * asociados, calcula costos, mantiene la trazabilidad de produccion e importa
 * piezas desde Excel.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Puzzle, SlidersHorizontal } from 'lucide-react';
import { ExportExcelButton } from '@/components/ExportExcelButton';
import { DateRangeFilter } from '@/components/data/DateRangeFilter';
import { SearchInput } from '@/components/data/SearchInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAppData } from '@/contexts/AppDataContext';
import { ImportExcelActions } from '@/features/importing/ImportExcelActions';
import { ImportExcelDialog } from '@/features/importing/ImportExcelDialog';
import { previewValue, type ImportPreviewColumn } from '@/features/importing/import-preview';
import { useExcelImport } from '@/features/importing/useExcelImport';
import { MaterialesConfigDialog } from '@/features/piezas/MaterialesConfigDialog';
import { HistorialDetailDialog, PiezaDetailDialog } from '@/features/piezas/PiezaDetailDialogs';
import { AddMaterialDialog, PiezaFormDialog } from '@/features/piezas/PiezaFormDialogs';
import { PiezasTable } from '@/features/piezas/PiezasTable';
import { buildPiezasSheets, filterPiezas, sortPiezas, type PiezaSortField } from '@/features/piezas/piezas-list';
import { useMaterialesConfig } from '@/features/piezas/useMaterialesConfig';
import { usePiezaForm } from '@/features/piezas/usePiezaForm';
import { useModulePermission } from '@/hooks/useModulePermission';
import { useSort } from '@/hooks/useSort';
import { ENDPOINTS } from '@/lib/api';
import type { Pieza, PiezaHistorial } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';

const IMPORT_COLUMNS: ImportPreviewColumn[] = [
  { header: 'Trace ID', value: row => previewValue(row, 'trace_id'), className: 'font-mono' },
  { header: 'Pieza', value: row => previewValue(row, 'nombre') },
  { header: 'Proyecto', value: row => previewValue(row, 'proyecto') },
  { header: 'Orden', value: row => previewValue(row, 'orden'), className: 'font-mono' },
  { header: 'Responsable', value: row => previewValue(row, 'usuario') },
  { header: 'Materiales', value: row => previewValue(row, 'materiales'), className: 'text-xs' },
];

export default function Piezas() {
  const { piezasList, deleteEntity, refreshProductionData } = useAppData();
  const { canManage, showPermissionDenied } = useModulePermission('piezas');
  const [search, setSearch] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const { sortField, sortDirection, toggleSort } = useSort<PiezaSortField>('trace_id');
  const [selected, setSelected] = useState<Pieza | null>(null);
  const [selectedHistorial, setSelectedHistorial] = useState<PiezaHistorial | null>(null);
  const materialesConfig = useMaterialesConfig();
  const piezaForm = usePiezaForm({
    // Si el detalle de esa pieza está abierto, debe reflejar lo recién guardado.
    onUpdated: pieza => setSelected(current => (current?.id === pieza.id ? pieza : current)),
  });

  const importer = useExcelImport({
    resourcePath: ENDPOINTS.piezas,
    templateFileName: 'plantilla_piezas.xlsx',
    successMessage: count => `Se importaron ${count} piezas correctamente.`,
    onImported: refreshProductionData,
  });

  const filtered = filterPiezas(piezasList, { search, fechaInicio, fechaFin });
  const sorted = sortPiezas(filtered, sortField, sortDirection);

  const handleDelete = async (pieza: Pieza) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    if (!window.confirm(`¿Eliminar la pieza ${pieza.trace_id || pieza.nombre || pieza.id}?`)) return;

    try {
      await deleteEntity('pieza', pieza);
      setSelected(current => (current?.id === pieza.id ? null : current));
    } catch (error) {
      window.alert(getErrorMessage(error, 'No se pudo eliminar la pieza.'));
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Puzzle className="w-6 h-6 text-primary" /> Piezas
          </h1>
          <p className="text-muted-foreground mt-1">Gestión de piezas y control de costos</p>
        </div>

        <DateRangeFilter from={fechaInicio} to={fechaFin} onFromChange={setFechaInicio} onToChange={setFechaFin} />

        <div className="flex flex-wrap items-center justify-end gap-2">
          <ExportExcelButton fileName="piezas" getSheets={() => buildPiezasSheets(sorted)} />

          {canManage && (
            <ImportExcelActions
              onImport={importer.open}
              rowHint="una fila por pieza con sus materiales como 'Resina: 20; Fibra: 10'"
            />
          )}

          {materialesConfig.isAdmin && (
            <Button type="button" variant="outline" onClick={materialesConfig.open}>
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Configurar materiales
            </Button>
          )}

          <Button type="button" onClick={piezaForm.open}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva pieza
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <SearchInput
              placeholder="Buscar por nombre, trace ID, orden o proyecto..."
              value={search}
              onChange={setSearch}
              className="flex-1 max-w-sm"
            />
          </div>
        </CardHeader>

        <CardContent>
          <PiezasTable
            piezas={sorted}
            canManage={canManage}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={toggleSort}
            onView={setSelected}
            onEdit={piezaForm.openEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <PiezaFormDialog form={piezaForm} />
      <MaterialesConfigDialog config={materialesConfig} />
      <AddMaterialDialog form={piezaForm} />
      <PiezaDetailDialog pieza={selected} onClose={() => setSelected(null)} onSelectHistorial={setSelectedHistorial} />
      <HistorialDetailDialog item={selectedHistorial} onClose={() => setSelectedHistorial(null)} />
      <ImportExcelDialog importer={importer} title="Importar Excel de piezas" inputId="piezas-import-file" columns={IMPORT_COLUMNS} />
    </motion.div>
  );
}
