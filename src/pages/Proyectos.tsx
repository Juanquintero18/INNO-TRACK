/**
 * Modulo de proyectos y ordenes de produccion.
 *
 * Permite administrar el maestro de proyectos y crear varias ordenes
 * dentro de cada proyecto para alimentar el flujo de piezas.
 */
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FolderKanban, Plus } from 'lucide-react';
import { ExportExcelButton } from '@/components/ExportExcelButton';
import { Button } from '@/components/ui/button';
import { useAppData } from '@/contexts/AppDataContext';
import { OrdenFormDialog, ProyectoFormDialog } from '@/features/proyectos/ProyectoDialogs';
import { OrdenesCard, ProyectoDetailCard, ProyectosCard } from '@/features/proyectos/ProyectosCards';
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
import { useSort } from '@/hooks/useSort';

export default function Proyectos() {
  const { proyectosList, ordenesList, piezasList } = useAppData();
  const [selectedProyectoId, setSelectedProyectoId] = useState<number | null>(null);
  const [projectFilters, setProjectFilters] = useState(EMPTY_FILTERS);
  const [orderFilters, setOrderFilters] = useState(EMPTY_FILTERS);
  const projectSort = useSort<ProyectoSortField>('nombre');
  const orderSort = useSort<OrdenSortField>('fecha_creacion', 'desc');

  // Siempre debe haber un proyecto seleccionado mientras exista alguno.
  useEffect(() => {
    if (proyectosList.length === 0) {
      setSelectedProyectoId(null);
      return;
    }

    const stillExists = selectedProyectoId != null && proyectosList.some(proyecto => proyecto.id === selectedProyectoId);

    if (!stillExists) {
      setSelectedProyectoId(proyectosList[0].id);
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

      <ProyectoDetailCard
        proyecto={selectedProyecto}
        ordenes={selectedProjectOrders}
        pieceCountByOrderId={pieceCountByOrderId}
      />

      <ProyectoFormDialog form={proyectoForm} />
      <OrdenFormDialog form={ordenForm} />
    </motion.div>
  );
}
