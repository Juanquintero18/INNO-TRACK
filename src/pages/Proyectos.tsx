/**
 * Modulo de proyectos y ordenes de produccion.
 *
 * Permite administrar el maestro de proyectos y crear varias ordenes
 * dentro de cada proyecto para alimentar el flujo de piezas; ambos se pueden
 * importar desde Excel.
 */
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FolderKanban, Plus } from 'lucide-react';
import { ExportExcelButton } from '@/components/ExportExcelButton';
import { Button } from '@/components/ui/button';
import { useAppData } from '@/contexts/AppDataContext';
import { ImportExcelActions } from '@/features/importing/ImportExcelActions';
import { ImportExcelDialog } from '@/features/importing/ImportExcelDialog';
import { useExcelImport } from '@/features/importing/useExcelImport';
import { OrdenFormDialog, ProyectoFormDialog } from '@/features/proyectos/ProyectoDialogs';
import { ProyectoDashboard } from '@/features/proyectos/ProyectoDashboard';
import { OrdenesCard, ProyectosCard } from '@/features/proyectos/ProyectosCards';
import { ORDENES_IMPORT_COLUMNS, PROYECTOS_IMPORT_COLUMNS } from '@/features/proyectos/proyectos-import';
import {
  EMPTY_FILTERS,
  buildProyectosSheets,
  filterOrdenes,
  filterProyectos,
  sortOrdenes,
  sortProyectos,
  type OrdenSortField,
  type ProyectoSortField,
} from '@/features/proyectos/proyectos-utils';
import { useOrdenForm } from '@/features/proyectos/useOrdenForm';
import { useProyectoForm } from '@/features/proyectos/useProyectoForm';
import { useProyectosDeletion } from '@/features/proyectos/useProyectosDeletion';
import { useModulePermission } from '@/hooks/useModulePermission';
import { useSort } from '@/hooks/useSort';
import { ENDPOINTS } from '@/lib/api';

export default function Proyectos() {
  const { proyectosList, ordenesList, piezasList, refreshProductionData } = useAppData();
  const { canManage } = useModulePermission('proyectos');
  const [selectedProyectoId, setSelectedProyectoId] = useState<number | null>(null);
  const [projectFilters, setProjectFilters] = useState(EMPTY_FILTERS);
  const [orderFilters, setOrderFilters] = useState(EMPTY_FILTERS);
  const projectSort = useSort<ProyectoSortField>('nombre');
  const orderSort = useSort<OrdenSortField>('fecha_creacion', 'desc');

  // La pantalla empieza sin proyecto seleccionado; si el elegido deja de existir, se quita la selección.
  useEffect(() => {
    if (selectedProyectoId != null && !proyectosList.some(proyecto => proyecto.id === selectedProyectoId)) {
      setSelectedProyectoId(null);
    }
  }, [proyectosList, selectedProyectoId]);

  // Conteos derivados para las tablas y las validaciones de borrado, sin recalcular por fila.
  const orderCountByProjectId = useMemo(
    () =>
      new Map(
        proyectosList.map(proyecto => [proyecto.id, ordenesList.filter(orden => orden.proyecto_id === proyecto.id).length])
      ),
    [proyectosList, ordenesList]
  );

  const pieceCountByOrderId = useMemo(
    () => new Map(ordenesList.map(orden => [orden.id, piezasList.filter(pieza => pieza.orden_id === orden.id).length])),
    [ordenesList, piezasList]
  );

  const proyectoForm = useProyectoForm({ onCreated: setSelectedProyectoId });
  const ordenForm = useOrdenForm({ selectedProyectoId, onSaved: setSelectedProyectoId });
  const { deleteProyecto, deleteOrden } = useProyectosDeletion(pieceCountByOrderId);
  const proyectosImporter = useExcelImport({
    resourcePath: ENDPOINTS.proyectos,
    templateFileName: 'plantilla_proyectos.xlsx',
    successMessage: count => `Se importaron ${count} proyectos correctamente.`,
    onImported: refreshProductionData,
  });
  // Las órdenes se enlazan a proyectos existentes: conviene importar primero los proyectos.
  const ordenesImporter = useExcelImport({
    resourcePath: ENDPOINTS.ordenes,
    templateFileName: 'plantilla_ordenes.xlsx',
    successMessage: count => `Se importaron ${count} órdenes correctamente.`,
    onImported: refreshProductionData,
  });

  const selectedProyecto = proyectosList.find(proyecto => proyecto.id === selectedProyectoId) ?? null;
  const selectedProjectOrders = ordenesList.filter(
    orden => selectedProyectoId != null && orden.proyecto_id === selectedProyectoId
  );

  const sortedProyectos = sortProyectos(
    filterProyectos(proyectosList, projectFilters),
    projectSort.sortField,
    projectSort.sortDirection,
    orderCountByProjectId
  );
  const sortedOrdenes = sortOrdenes(
    filterOrdenes(ordenesList, selectedProyectoId, orderFilters),
    orderSort.sortField,
    orderSort.sortDirection,
    pieceCountByOrderId
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-primary" /> Proyectos
          </h1>
          <p className="text-muted-foreground mt-1">Gestion de proyectos y ordenes de produccion</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportExcelButton
            fileName="proyectos"
            getSheets={() => buildProyectosSheets(sortedProyectos, ordenesList, orderCountByProjectId, pieceCountByOrderId)}
          />

          {canManage && (
            <>
              <ImportExcelActions
                onImport={proyectosImporter.open}
                label="Importar proyectos"
                rowHint="una fila por proyecto"
              />
              <ImportExcelActions
                onImport={ordenesImporter.open}
                label="Importar órdenes"
                rowHint="una fila por orden indicando el código o nombre de su proyecto"
              />
            </>
          )}

          <Button type="button" variant="outline" onClick={ordenForm.openNew}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva orden
          </Button>
          <Button type="button" onClick={proyectoForm.openNew}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo proyecto
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ProyectosCard
          proyectos={sortedProyectos}
          selectedProyectoId={selectedProyectoId}
          onSelect={setSelectedProyectoId}
          orderCountByProjectId={orderCountByProjectId}
          filters={projectFilters}
          onFiltersChange={setProjectFilters}
          sort={{ field: projectSort.sortField, direction: projectSort.sortDirection, onSort: projectSort.toggleSort }}
          onEdit={proyectoForm.openEdit}
          onDelete={proyecto => void deleteProyecto(proyecto)}
        />

        <OrdenesCard
          proyecto={selectedProyecto}
          ordenes={sortedOrdenes}
          pieceCountByOrderId={pieceCountByOrderId}
          filters={orderFilters}
          onFiltersChange={setOrderFilters}
          sort={{ field: orderSort.sortField, direction: orderSort.sortDirection, onSort: orderSort.toggleSort }}
          onEdit={ordenForm.openEdit}
          onDelete={orden => void deleteOrden(orden)}
        />
      </div>

      <ProyectoDashboard
        proyecto={selectedProyecto}
        ordenes={selectedProjectOrders}
        piezas={piezasList}
        onClearSelection={() => setSelectedProyectoId(null)}
      />

      <ProyectoFormDialog form={proyectoForm} />
      <OrdenFormDialog form={ordenForm} />
      <ImportExcelDialog
        importer={proyectosImporter}
        title="Importar Excel de proyectos"
        inputId="proyectos-import-file"
        columns={PROYECTOS_IMPORT_COLUMNS}
      />
      <ImportExcelDialog
        importer={ordenesImporter}
        title="Importar Excel de órdenes"
        inputId="ordenes-import-file"
        columns={ORDENES_IMPORT_COLUMNS}
      />
    </motion.div>
  );
}
