import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api';
import { ArrowUpDown, FolderKanban, ListOrdered, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { Orden, Proyecto } from '@/lib/types';

type ProyectoSortField = 'codigo' | 'nombre' | 'estado' | 'fecha_inicio' | 'total_ordenes';
type OrdenSortField = 'codigo_orden' | 'fecha_creacion' | 'estado' | 'total_piezas';

const projectStatusOptions = [
  { value: 'planeacion', label: 'Planeacion' },
  { value: 'activo', label: 'Activo' },
  { value: 'pausado', label: 'Pausado' },
  { value: 'finalizado', label: 'Finalizado' },
];

const orderStatusOptions = [
  { value: 'abierta', label: 'Abierta' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'cerrada', label: 'Cerrada' },
  { value: 'cancelada', label: 'Cancelada' },
];

const formatFecha = (fecha?: string | null) => {
  if (!fecha) return '—';

  const [year, month, day] = fecha.split('-');
  if (!year || !month || !day) return fecha;

  return `${day}/${month}/${year}`;
};

const normalizeStatus = (value?: string | null) => (value ?? '').trim().toLowerCase();

const formatStatusLabel = (value?: string | null) => {
  if (!value) return 'Sin estado';
  return value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
};

const isWithinDateRange = (fecha: string | null | undefined, from: string, to: string) => {
  if (!from && !to) return true;
  if (!fecha) return false;

  if (from && fecha < from) return false;
  if (to && fecha > to) return false;

  return true;
};

/**
 * Modulo de proyectos y ordenes de produccion.
 *
 * Permite administrar el maestro de proyectos y crear varias ordenes
 * dentro de cada proyecto para alimentar el flujo de piezas.
 */
export default function Proyectos() {
  const { canEditModule } = useAuth();
  const canManage = canEditModule('proyectos');
  const {
    proyectosList,
    setProyectosList,
    ordenesList,
    setOrdenesList,
    piezasList,
  } = useAppData();

  const [selectedProyectoId, setSelectedProyectoId] = useState<number | null>(null);

  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState('all');
  const [projectDateFromFilter, setProjectDateFromFilter] = useState('');
  const [projectDateToFilter, setProjectDateToFilter] = useState('');
  const [projectSortField, setProjectSortField] = useState<ProyectoSortField>('nombre');
  const [projectSortDirection, setProjectSortDirection] = useState<'asc' | 'desc'>('asc');

  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderDateFromFilter, setOrderDateFromFilter] = useState('');
  const [orderDateToFilter, setOrderDateToFilter] = useState('');
  const [orderSortField, setOrderSortField] = useState<OrdenSortField>('fecha_creacion');
  const [orderSortDirection, setOrderSortDirection] = useState<'asc' | 'desc'>('desc');

  const [openProjectDialog, setOpenProjectDialog] = useState(false);
  const [editingProyecto, setEditingProyecto] = useState<Proyecto | null>(null);
  const [projectFormError, setProjectFormError] = useState('');
  const [projectFormData, setProjectFormData] = useState({
    nombre: '',
    codigo: '',
    descripcion: '',
    fecha_inicio: '',
    fecha_fin: '',
    estado: 'planeacion',
  });

  const [openOrderDialog, setOpenOrderDialog] = useState(false);
  const [editingOrden, setEditingOrden] = useState<Orden | null>(null);
  const [orderFormError, setOrderFormError] = useState('');
  const [orderFormData, setOrderFormData] = useState({
    proyecto_id: '',
    codigo_orden: '',
    fecha_creacion: '',
    estado: 'abierta',
  });

  const showPermissionDenied = () => {
    window.alert('No tienes permisos para editar en el modulo de Proyectos.');
  };

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

  const orderCountByProjectId = useMemo(
    // Métrica derivada para tabla y validaciones de borrado sin recalcular por fila.
    () => new Map(proyectosList.map(proyecto => [
      proyecto.id,
      ordenesList.filter(orden => orden.proyecto_id === proyecto.id).length,
    ])),
    [proyectosList, ordenesList]
  );

  const pieceCountByOrderId = useMemo(
    () => new Map(ordenesList.map(orden => [
      orden.id,
      piezasList.filter(pieza => pieza.orden_id === orden.id).length,
    ])),
    [ordenesList, piezasList]
  );

  const selectedProjectOrders = useMemo(
    () => ordenesList.filter(orden => selectedProyectoId != null && orden.proyecto_id === selectedProyectoId),
    [ordenesList, selectedProyectoId]
  );

  const selectedProjectTotalPieces = useMemo(
    () => selectedProjectOrders.reduce((total, orden) => total + (pieceCountByOrderId.get(orden.id) ?? 0), 0),
    [selectedProjectOrders, pieceCountByOrderId]
  );

  const selectedProjectOrdersByStatus = useMemo(() => {
    const statusCounter = new Map<string, number>();

    for (const orden of selectedProjectOrders) {
      const key = normalizeStatus(orden.estado) || 'sin_estado';
      statusCounter.set(key, (statusCounter.get(key) ?? 0) + 1);
    }

    return statusCounter;
  }, [selectedProjectOrders]);

  const selectedProjectOrdersForDetail = useMemo(
    () => [...selectedProjectOrders].sort((left, right) => (right.fecha_creacion ?? '').localeCompare(left.fecha_creacion ?? '')),
    [selectedProjectOrders]
  );

  const selectedProjectFirstOrderDate = useMemo(
    () => selectedProjectOrders.reduce((minDate, orden) => {
      const fecha = orden.fecha_creacion;
      if (!fecha) return minDate;
      if (!minDate || fecha < minDate) return fecha;
      return minDate;
    }, ''),
    [selectedProjectOrders]
  );

  const selectedProjectLastOrderDate = useMemo(
    () => selectedProjectOrders.reduce((maxDate, orden) => {
      const fecha = orden.fecha_creacion;
      if (!fecha) return maxDate;
      if (!maxDate || fecha > maxDate) return fecha;
      return maxDate;
    }, ''),
    [selectedProjectOrders]
  );

  const filteredProyectos = proyectosList.filter(proyecto => {
    const term = projectSearch.toLowerCase();
    const statusMatches = projectStatusFilter === 'all' || normalizeStatus(proyecto.estado) === projectStatusFilter;
    const dateMatches = isWithinDateRange(proyecto.fecha_inicio, projectDateFromFilter, projectDateToFilter);
    const searchMatches =
      (proyecto.nombre ?? '').toLowerCase().includes(term) ||
      (proyecto.codigo ?? '').toLowerCase().includes(term) ||
      (proyecto.estado ?? '').toLowerCase().includes(term);

    return searchMatches && statusMatches && dateMatches;
  });

  const sortedProyectos = [...filteredProyectos].sort((left, right) => {
    const leftValue =
      projectSortField === 'total_ordenes'
        ? orderCountByProjectId.get(left.id) ?? 0
        : (left[projectSortField] ?? '').toString().toLowerCase();

    const rightValue =
      projectSortField === 'total_ordenes'
        ? orderCountByProjectId.get(right.id) ?? 0
        : (right[projectSortField] ?? '').toString().toLowerCase();

    if (leftValue < rightValue) return projectSortDirection === 'asc' ? -1 : 1;
    if (leftValue > rightValue) return projectSortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const selectedProyecto = proyectosList.find(proyecto => proyecto.id === selectedProyectoId) ?? null;

  const filteredOrdenes = ordenesList.filter(orden => {
    if (!selectedProyectoId || orden.proyecto_id !== selectedProyectoId) return false;

    const term = orderSearch.toLowerCase();
    const statusMatches = orderStatusFilter === 'all' || normalizeStatus(orden.estado) === orderStatusFilter;
    const dateMatches = isWithinDateRange(orden.fecha_creacion, orderDateFromFilter, orderDateToFilter);
    const searchMatches =
      (orden.codigo_orden ?? '').toLowerCase().includes(term) ||
      (orden.estado ?? '').toLowerCase().includes(term);

    return searchMatches && statusMatches && dateMatches;
  });

  const sortedOrdenes = [...filteredOrdenes].sort((left, right) => {
    const leftValue =
      orderSortField === 'total_piezas'
        ? pieceCountByOrderId.get(left.id) ?? 0
        : (left[orderSortField] ?? '').toString().toLowerCase();

    const rightValue =
      orderSortField === 'total_piezas'
        ? pieceCountByOrderId.get(right.id) ?? 0
        : (right[orderSortField] ?? '').toString().toLowerCase();

    if (leftValue < rightValue) return orderSortDirection === 'asc' ? -1 : 1;
    if (leftValue > rightValue) return orderSortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const resetProjectForm = () => {
    setProjectFormData({
      nombre: '',
      codigo: '',
      descripcion: '',
      fecha_inicio: '',
      fecha_fin: '',
      estado: 'planeacion',
    });
    setProjectFormError('');
    setEditingProyecto(null);
  };

  const resetOrderForm = () => {
    setOrderFormData({
      proyecto_id: selectedProyectoId ? String(selectedProyectoId) : '',
      codigo_orden: '',
      fecha_creacion: '',
      estado: 'abierta',
    });
    setOrderFormError('');
    setEditingOrden(null);
  };

  const handleProjectSort = (field: ProyectoSortField) => {
    if (projectSortField === field) {
      setProjectSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setProjectSortField(field);
    setProjectSortDirection('asc');
  };

  const handleOrderSort = (field: OrdenSortField) => {
    if (orderSortField === field) {
      setOrderSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setOrderSortField(field);
    setOrderSortDirection('asc');
  };

  const renderProjectSortableHeader = (label: string, field: ProyectoSortField) => (
    <button
      type="button"
      onClick={() => handleProjectSort(field)}
      className="inline-flex items-center gap-1 font-semibold text-foreground transition-colors hover:text-primary"
    >
      <span>{label}</span>
      <ArrowUpDown className={`h-4 w-4 ${projectSortField === field ? 'text-primary' : 'text-muted-foreground'}`} />
    </button>
  );

  const renderOrderSortableHeader = (label: string, field: OrdenSortField) => (
    <button
      type="button"
      onClick={() => handleOrderSort(field)}
      className="inline-flex items-center gap-1 font-semibold text-foreground transition-colors hover:text-primary"
    >
      <span>{label}</span>
      <ArrowUpDown className={`h-4 w-4 ${orderSortField === field ? 'text-primary' : 'text-muted-foreground'}`} />
    </button>
  );

  const handleCreateProyecto = () => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    resetProjectForm();
    setOpenProjectDialog(true);
  };

  const handleCreateOrden = () => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    if (proyectosList.length === 0) {
      window.alert('Primero debes crear al menos un proyecto para registrar ordenes.');
      return;
    }

    resetOrderForm();
    setOpenOrderDialog(true);
  };

  const handleEditProyecto = (proyecto: Proyecto) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    setEditingProyecto(proyecto);
    setProjectFormData({
      nombre: proyecto.nombre ?? '',
      codigo: proyecto.codigo ?? '',
      descripcion: proyecto.descripcion ?? '',
      fecha_inicio: proyecto.fecha_inicio ?? '',
      fecha_fin: proyecto.fecha_fin ?? '',
      estado: proyecto.estado ?? 'planeacion',
    });
    setProjectFormError('');
    setOpenProjectDialog(true);
  };

  const handleEditOrden = (orden: Orden) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    setEditingOrden(orden);
    setOrderFormData({
      proyecto_id: orden.proyecto_id != null ? String(orden.proyecto_id) : '',
      codigo_orden: orden.codigo_orden ?? '',
      fecha_creacion: orden.fecha_creacion ?? '',
      estado: orden.estado ?? 'abierta',
    });
    setOrderFormError('');
    setOpenOrderDialog(true);
  };

  const handleDeleteProyecto = async (proyecto: Proyecto) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    // Guardrail de UI alineado con la regla de negocio: no borrar con dependencias.
    const relatedOrders = ordenesList.filter(orden => orden.proyecto_id === proyecto.id);

    if (relatedOrders.length > 0) {
      const totalPieces = relatedOrders.reduce((total, orden) => total + (pieceCountByOrderId.get(orden.id) ?? 0), 0);
      const orderPreview = relatedOrders
        .slice(0, 5)
        .map(orden => `- ${orden.codigo_orden || `Orden #${orden.id}`} (${pieceCountByOrderId.get(orden.id) ?? 0} pieza(s))`)
        .join('\n');

      window.alert(
        `No puedes eliminar el proyecto ${proyecto.nombre || proyecto.id} porque tiene dependencias activas.\n\n` +
          `Órdenes asociadas: ${relatedOrders.length}\n` +
          `Piezas asociadas en esas órdenes: ${totalPieces}\n\n` +
          `Resumen de órdenes:\n${orderPreview}\n\n` +
          'Elimina o reasigna esas órdenes antes de intentar borrar el proyecto.'
      );
      return;
    }

    const confirmText =
      `Vas a eliminar este proyecto de forma permanente.\n\n` +
      `Proyecto: ${proyecto.nombre || `Proyecto #${proyecto.id}`}\n` +
      `Código: ${proyecto.codigo || 'Sin código'}\n` +
      `Estado: ${formatStatusLabel(proyecto.estado)}\n` +
      `Fecha inicio: ${formatFecha(proyecto.fecha_inicio)}\n` +
      `Fecha fin: ${formatFecha(proyecto.fecha_fin)}\n\n` +
      'Esta acción no se puede deshacer. ¿Deseas continuar?';

    if (!window.confirm(confirmText)) return;

    try {
      await apiRequest(`/api/production/proyectos/${proyecto.id}/`, { method: 'DELETE' });
      setProyectosList(prev => prev.filter(item => item.id !== proyecto.id));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo eliminar el proyecto.');
    }
  };

  const handleDeleteOrden = async (orden: Orden) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    // Guardrail equivalente para evitar borrar órdenes con piezas asociadas.
    const relatedPieces = piezasList.filter(pieza => pieza.orden_id === orden.id);
    const projectLabel = proyectosList.find(proyecto => proyecto.id === orden.proyecto_id)?.nombre || `Proyecto #${orden.proyecto_id}`;

    if (relatedPieces.length > 0) {
      const piecesPreview = relatedPieces
        .slice(0, 5)
        .map(pieza => `- ${pieza.trace_id || pieza.nombre || `Pieza #${pieza.id}`}`)
        .join('\n');

      window.alert(
        `No puedes eliminar la orden ${orden.codigo_orden || orden.id} porque tiene piezas asociadas.\n\n` +
          `Proyecto: ${projectLabel}\n` +
          `Piezas asociadas: ${relatedPieces.length}\n\n` +
          `Ejemplos de piezas:\n${piecesPreview}\n\n` +
          'Debes eliminar o mover esas piezas antes de borrar la orden.'
      );
      return;
    }

    const confirmText =
      `Vas a eliminar esta orden de forma permanente.\n\n` +
      `Orden: ${orden.codigo_orden || `Orden #${orden.id}`}\n` +
      `Proyecto: ${projectLabel}\n` +
      `Estado: ${formatStatusLabel(orden.estado)}\n` +
      `Fecha creación: ${formatFecha(orden.fecha_creacion)}\n\n` +
      'Esta acción no se puede deshacer. ¿Deseas continuar?';

    if (!window.confirm(confirmText)) return;

    try {
      await apiRequest(`/api/production/ordenes/${orden.id}/`, { method: 'DELETE' });
      setOrdenesList(prev => prev.filter(item => item.id !== orden.id));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo eliminar la orden.');
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManage) {
      showPermissionDenied();
      return;
    }

    const nombre = projectFormData.nombre.trim();
    const codigo = projectFormData.codigo.trim();
    const descripcion = projectFormData.descripcion.trim();
    const fechaInicio = projectFormData.fecha_inicio;
    const fechaFin = projectFormData.fecha_fin;
    const estado = projectFormData.estado.trim();

    if (!nombre) {
      setProjectFormError('El nombre del proyecto es obligatorio.');
      return;
    }

    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
      setProjectFormError('La fecha fin no puede ser anterior a la fecha inicio.');
      return;
    }

    const codigoDuplicado = codigo
      ? proyectosList.some(
          proyecto =>
            (proyecto.codigo ?? '').toLowerCase() === codigo.toLowerCase() &&
            proyecto.id !== editingProyecto?.id
        )
      : false;

    if (codigoDuplicado) {
      setProjectFormError('Ese codigo de proyecto ya existe.');
      return;
    }

    const payload = {
      nombre,
      codigo: codigo || null,
      descripcion: descripcion || null,
      fecha_inicio: fechaInicio || null,
      fecha_fin: fechaFin || null,
      estado: estado || null,
    };

    try {
      if (editingProyecto) {
        const updatedProyecto = await apiRequest<Proyecto>(`/api/production/proyectos/${editingProyecto.id}/`, {
          method: 'PUT',
          json: payload,
        });

        setProyectosList(prev => prev.map(proyecto => proyecto.id === editingProyecto.id ? updatedProyecto : proyecto));
      } else {
        const createdProyecto = await apiRequest<Proyecto>('/api/production/proyectos/', {
          method: 'POST',
          json: payload,
        });

        setProyectosList(prev => [createdProyecto, ...prev]);
        setSelectedProyectoId(createdProyecto.id);
      }

      setOpenProjectDialog(false);
      resetProjectForm();
    } catch (error) {
      setProjectFormError(error instanceof Error ? error.message : 'No se pudo guardar el proyecto.');
    }
  };

  const handleOrderSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManage) {
      showPermissionDenied();
      return;
    }

    const proyectoId = Number(orderFormData.proyecto_id);
    const codigoOrden = orderFormData.codigo_orden.trim();
    const fechaCreacion = orderFormData.fecha_creacion;
    const estado = orderFormData.estado.trim();

    if (!proyectoId || Number.isNaN(proyectoId)) {
      setOrderFormError('Debes seleccionar un proyecto.');
      return;
    }

    if (!codigoOrden) {
      setOrderFormError('El codigo de la orden es obligatorio.');
      return;
    }

    const projectExists = proyectosList.some(proyecto => proyecto.id === proyectoId);

    if (!projectExists) {
      setOrderFormError('Selecciona un proyecto valido.');
      return;
    }

    const duplicateOrderCode = ordenesList.some(
      // El código de orden se exige único dentro del mismo proyecto.
      orden =>
        orden.proyecto_id === proyectoId &&
        (orden.codigo_orden ?? '').toLowerCase() === codigoOrden.toLowerCase() &&
        orden.id !== editingOrden?.id
    );

    if (duplicateOrderCode) {
      setOrderFormError('Ese codigo de orden ya existe dentro del proyecto seleccionado.');
      return;
    }

    const payload = {
      proyecto_id: proyectoId,
      codigo_orden: codigoOrden,
      fecha_creacion: fechaCreacion || null,
      estado: estado || null,
    };

    try {
      if (editingOrden) {
        const updatedOrden = await apiRequest<Orden>(`/api/production/ordenes/${editingOrden.id}/`, {
          method: 'PUT',
          json: payload,
        });

        setOrdenesList(prev => prev.map(orden => orden.id === editingOrden.id ? updatedOrden : orden));
      } else {
        const createdOrden = await apiRequest<Orden>('/api/production/ordenes/', {
          method: 'POST',
          json: payload,
        });

        setOrdenesList(prev => [createdOrden, ...prev]);
      }

      setSelectedProyectoId(proyectoId);
      setOpenOrderDialog(false);
      resetOrderForm();
    } catch (error) {
      setOrderFormError(error instanceof Error ? error.message : 'No se pudo guardar la orden.');
    }
  };

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
          <Button type="button" variant="outline" onClick={handleCreateOrden}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva orden
          </Button>
          <Button type="button" onClick={handleCreateProyecto}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo proyecto
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="space-y-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="font-semibold text-foreground">Proyectos registrados</p>
                <div className="relative w-full md:max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar proyecto por nombre, codigo o estado..."
                    value={projectSearch}
                    onChange={e => setProjectSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <Select value={projectStatusFilter} onValueChange={setProjectStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      {projectStatusOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="project-filter-from" className="text-xs text-muted-foreground">Inicio desde</Label>
                  <Input
                    id="project-filter-from"
                    type="date"
                    value={projectDateFromFilter}
                    onChange={e => setProjectDateFromFilter(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="project-filter-to" className="text-xs text-muted-foreground">Inicio hasta</Label>
                  <Input
                    id="project-filter-to"
                    type="date"
                    min={projectDateFromFilter || undefined}
                    value={projectDateToFilter}
                    onChange={e => setProjectDateToFilter(e.target.value)}
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setProjectSearch('');
                      setProjectStatusFilter('all');
                      setProjectDateFromFilter('');
                      setProjectDateToFilter('');
                    }}
                  >
                    Limpiar filtros
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{renderProjectSortableHeader('Codigo', 'codigo')}</TableHead>
                  <TableHead>{renderProjectSortableHeader('Nombre', 'nombre')}</TableHead>
                  <TableHead>{renderProjectSortableHeader('Estado', 'estado')}</TableHead>
                  <TableHead>{renderProjectSortableHeader('Inicio', 'fecha_inicio')}</TableHead>
                  <TableHead className="text-right">{renderProjectSortableHeader('Ordenes', 'total_ordenes')}</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sortedProyectos.map(proyecto => (
                  <TableRow
                    key={proyecto.id}
                    className={selectedProyectoId === proyecto.id ? 'bg-primary/5' : ''}
                    onClick={() => setSelectedProyectoId(proyecto.id)}
                  >
                    <TableCell className="font-mono text-muted-foreground">{proyecto.codigo || '—'}</TableCell>
                    <TableCell className="font-medium">{proyecto.nombre || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{formatStatusLabel(proyecto.estado)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatFecha(proyecto.fecha_inicio)}</TableCell>
                    <TableCell className="text-right font-semibold">{orderCountByProjectId.get(proyecto.id) ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={event => {
                            event.stopPropagation();
                            handleEditProyecto(proyecto);
                          }}
                          title="Editar proyecto"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={event => {
                            event.stopPropagation();
                            void handleDeleteProyecto(proyecto);
                          }}
                          title="Eliminar proyecto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {sortedProyectos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No hay proyectos que coincidan con la busqueda actual.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

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
                    {selectedProyecto
                      ? `${selectedProyecto.nombre || 'Proyecto sin nombre'} (${selectedProyecto.codigo || `ID ${selectedProyecto.id}`})`
                      : 'Selecciona un proyecto para ver sus ordenes.'}
                  </p>
                </div>

                <div className="relative w-full md:max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar orden por codigo o estado..."
                    value={orderSearch}
                    onChange={e => setOrderSearch(e.target.value)}
                    className="pl-9"
                    disabled={!selectedProyecto}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter} disabled={!selectedProyecto}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      {orderStatusOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="order-filter-from" className="text-xs text-muted-foreground">Creación desde</Label>
                  <Input
                    id="order-filter-from"
                    type="date"
                    value={orderDateFromFilter}
                    onChange={e => setOrderDateFromFilter(e.target.value)}
                    disabled={!selectedProyecto}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="order-filter-to" className="text-xs text-muted-foreground">Creación hasta</Label>
                  <Input
                    id="order-filter-to"
                    type="date"
                    min={orderDateFromFilter || undefined}
                    value={orderDateToFilter}
                    onChange={e => setOrderDateToFilter(e.target.value)}
                    disabled={!selectedProyecto}
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={!selectedProyecto}
                    onClick={() => {
                      setOrderSearch('');
                      setOrderStatusFilter('all');
                      setOrderDateFromFilter('');
                      setOrderDateToFilter('');
                    }}
                  >
                    Limpiar filtros
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {!selectedProyecto ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                Aun no hay un proyecto seleccionado.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{renderOrderSortableHeader('Codigo', 'codigo_orden')}</TableHead>
                    <TableHead>{renderOrderSortableHeader('Fecha', 'fecha_creacion')}</TableHead>
                    <TableHead>{renderOrderSortableHeader('Estado', 'estado')}</TableHead>
                    <TableHead className="text-right">{renderOrderSortableHeader('Piezas', 'total_piezas')}</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {sortedOrdenes.map(orden => (
                    <TableRow key={orden.id}>
                      <TableCell className="font-mono text-primary font-medium">{orden.codigo_orden || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{formatFecha(orden.fecha_creacion)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{formatStatusLabel(orden.estado)}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{pieceCountByOrderId.get(orden.id) ?? 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditOrden(orden)}
                            title="Editar orden"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>

                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => void handleDeleteOrden(orden)}
                            title="Eliminar orden"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {sortedOrdenes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Este proyecto aun no tiene ordenes registradas.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

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
          {!selectedProyecto ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
              Selecciona un proyecto para visualizar su detalle y métricas.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Código</p>
                  <p className="mt-1 text-base font-semibold text-foreground">{selectedProyecto.codigo || 'Sin código'}</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Estado</p>
                  <p className="mt-1 text-base font-semibold text-foreground">{formatStatusLabel(selectedProyecto.estado)}</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Fecha inicio</p>
                  <p className="mt-1 text-base font-semibold text-foreground">{formatFecha(selectedProyecto.fecha_inicio)}</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Fecha fin</p>
                  <p className="mt-1 text-base font-semibold text-foreground">{formatFecha(selectedProyecto.fecha_fin)}</p>
                </div>
              </div>

              <div className="rounded-lg border bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Descripción</p>
                <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">
                  {selectedProyecto.descripcion || 'Sin descripción registrada.'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Órdenes totales</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{selectedProjectOrders.length}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Piezas totales</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{selectedProjectTotalPieces}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Primera orden</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{formatFecha(selectedProjectFirstOrderDate || null)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Última orden</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{formatFecha(selectedProjectLastOrderDate || null)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Distribución de órdenes por estado</p>
                <div className="flex flex-wrap gap-2">
                  {selectedProjectOrdersByStatus.size > 0 ? (
                    Array.from(selectedProjectOrdersByStatus.entries()).map(([status, count]) => (
                      <Badge key={status} variant="secondary">
                        {formatStatusLabel(status)}: {count}
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
                    {selectedProjectOrdersForDetail.length > 0 ? (
                      selectedProjectOrdersForDetail.map(orden => (
                        <TableRow key={`detail-order-${orden.id}`}>
                          <TableCell className="font-mono text-primary font-medium">{orden.codigo_orden || `Orden #${orden.id}`}</TableCell>
                          <TableCell className="text-muted-foreground">{formatFecha(orden.fecha_creacion)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{formatStatusLabel(orden.estado)}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{pieceCountByOrderId.get(orden.id) ?? 0}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Este proyecto no tiene órdenes registradas.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={openProjectDialog}
        onOpenChange={open => {
          setOpenProjectDialog(open);
          if (!open) resetProjectForm();
        }}
      >
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProyecto ? 'Editar proyecto' : 'Nuevo proyecto'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleProjectSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-primary">*</span> es obligatorio
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="project_codigo">Codigo</Label>
                <Input
                  id="project_codigo"
                  placeholder="PRJ-001"
                  value={projectFormData.codigo}
                  onChange={e => {
                    setProjectFormData(prev => ({ ...prev, codigo: e.target.value }));
                    if (projectFormError) setProjectFormError('');
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_nombre">Nombre <span className="text-primary">*</span></Label>
                <Input
                  id="project_nombre"
                  placeholder="Proyecto de turbinas"
                  value={projectFormData.nombre}
                  onChange={e => {
                    setProjectFormData(prev => ({ ...prev, nombre: e.target.value }));
                    if (projectFormError) setProjectFormError('');
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={projectFormData.estado}
                  onValueChange={value => {
                    setProjectFormData(prev => ({ ...prev, estado: value }));
                    if (projectFormError) setProjectFormError('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectStatusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_fecha_inicio">Fecha inicio</Label>
                <Input
                  id="project_fecha_inicio"
                  type="date"
                  value={projectFormData.fecha_inicio}
                  onChange={e => {
                    setProjectFormData(prev => ({ ...prev, fecha_inicio: e.target.value }));
                    if (projectFormError) setProjectFormError('');
                  }}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="project_fecha_fin">Fecha fin</Label>
                <Input
                  id="project_fecha_fin"
                  type="date"
                  min={projectFormData.fecha_inicio || undefined}
                  value={projectFormData.fecha_fin}
                  onChange={e => {
                    setProjectFormData(prev => ({ ...prev, fecha_fin: e.target.value }));
                    if (projectFormError) setProjectFormError('');
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_descripcion">Descripcion</Label>
              <Textarea
                id="project_descripcion"
                rows={4}
                placeholder="Describe el alcance del proyecto..."
                value={projectFormData.descripcion}
                onChange={e => {
                  setProjectFormData(prev => ({ ...prev, descripcion: e.target.value }));
                  if (projectFormError) setProjectFormError('');
                }}
              />
            </div>

            {projectFormError && (
              <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {projectFormError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenProjectDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingProyecto ? 'Actualizar' : 'Guardar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openOrderDialog}
        onOpenChange={open => {
          setOpenOrderDialog(open);
          if (!open) resetOrderForm();
        }}
      >
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOrden ? 'Editar orden' : 'Nueva orden'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleOrderSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-primary">*</span> es obligatorio
            </p>

            <div className="space-y-2">
              <Label>Proyecto <span className="text-primary">*</span></Label>
              <Select
                value={orderFormData.proyecto_id}
                onValueChange={value => {
                  setOrderFormData(prev => ({ ...prev, proyecto_id: value }));
                  if (orderFormError) setOrderFormError('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un proyecto" />
                </SelectTrigger>
                <SelectContent>
                  {proyectosList.map(proyecto => (
                    <SelectItem key={proyecto.id} value={String(proyecto.id)}>
                      {proyecto.codigo ? `${proyecto.codigo} - ${proyecto.nombre}` : proyecto.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order_codigo">Codigo de orden <span className="text-primary">*</span></Label>
              <Input
                id="order_codigo"
                placeholder="ORD-0001"
                value={orderFormData.codigo_orden}
                onChange={e => {
                  setOrderFormData(prev => ({ ...prev, codigo_orden: e.target.value }));
                  if (orderFormError) setOrderFormError('');
                }}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="order_fecha">Fecha de creacion</Label>
                <Input
                  id="order_fecha"
                  type="date"
                  value={orderFormData.fecha_creacion}
                  onChange={e => {
                    setOrderFormData(prev => ({ ...prev, fecha_creacion: e.target.value }));
                    if (orderFormError) setOrderFormError('');
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={orderFormData.estado}
                  onValueChange={value => {
                    setOrderFormData(prev => ({ ...prev, estado: value }));
                    if (orderFormError) setOrderFormError('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {orderStatusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {orderFormError && (
              <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {orderFormError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenOrderDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingOrden ? 'Actualizar' : 'Guardar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
