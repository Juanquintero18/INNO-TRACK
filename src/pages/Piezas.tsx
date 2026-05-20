import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calcularCostoPieza, calcularPesoTeoricoPieza } from '@/lib/domain-utils';
import { useAppData } from '@/contexts/AppDataContext';
import { apiRequest } from '@/lib/api';
import { Search, Eye, Puzzle, Plus, Pencil, Trash2, ArrowUpDown, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

import type { MateriaPrima, Pieza, PiezaHistorial, PiezaMateriaPrima } from '@/lib/types';

const historialFieldLabels: Record<string, string> = {
  trace_id: 'Trace ID',
  nombre: 'Nombre',
  orden_id: 'Orden',
  usuario_id: 'Usuario responsable',
  fecha_gelcoat: 'Fecha gelcoat',
  fecha_qc: 'Fecha QC',
  peso_real: 'Peso real',
};

const materialChangeLabels: Record<'agregado' | 'eliminado' | 'actualizado', string> = {
  agregado: 'Material agregado',
  eliminado: 'Material eliminado',
  actualizado: 'Material actualizado',
};

const BOGOTA_TIMEZONE = 'America/Bogota';

/**
 * Pantalla de piezas fabricadas.
 *
 * Es el modulo mas completo del frontend: consulta piezas, registra materiales
 * asociados, calcula costos y mantiene la trazabilidad de produccion.
 */
export default function Piezas() {
  const { user, canEditModule } = useAuth();
  const isAdmin = user?.rol === 'administrador';
  const canManage = canEditModule('piezas');
  const { piezasList, setPiezasList, materiasList, setMateriasList, usuariosList, proyectosList, ordenesList, deleteEntity, refreshProductionData } = useAppData();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Pieza | null>(null);
  const [selectedHistorial, setSelectedHistorial] = useState<PiezaHistorial | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [openMaterialsModal, setOpenMaterialsModal] = useState(false);
  const [openMaterialConfigModal, setOpenMaterialConfigModal] = useState(false);
  const [editingPieza, setEditingPieza] = useState<Pieza | null>(null);
  const [sortField, setSortField] = useState<'trace_id' | 'nombre' | 'proyecto' | 'orden' | 'fecha_gelcoat' | 'fecha_qc' | 'peso_real' | 'costo' | 'estado'>('trace_id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [formData, setFormData] = useState({
    trace_id: '',
    nombre: '',
    proyecto_id: '',
    orden_id: '',
    usuario_id: '',
    fecha_gelcoat: '',
    fecha_qc: '',
    peso_real: '',
  });
  const [formError, setFormError] = useState('');
  const [materialesForm, setMaterialesForm] = useState<PiezaMateriaPrima[]>([]);
  const [materialFormData, setMaterialFormData] = useState({
    materia_prima_id: '',
    cantidad: '',
  });
  const [materialFormError, setMaterialFormError] = useState('');
  const [materialConfigEnabledIds, setMaterialConfigEnabledIds] = useState<number[]>([]);
  const [materialConfigError, setMaterialConfigError] = useState('');
  const [isSavingMaterialConfig, setIsSavingMaterialConfig] = useState(false);

  const showPermissionDenied = () => {
    window.alert('No tienes permisos para editar en el módulo de Piezas.');
  };

  const showAdminOnly = () => {
    window.alert('Solo el administrador puede configurar los materiales habilitados para piezas.');
  };

  // Compatibilidad: si el backend no envía la bandera (por despliegue parcial),
  // se asume habilitada para no bloquear producción.
  const isMateriaEnabledForPiezas = (materia: MateriaPrima) => materia.enabled_for_piezas !== false;

  const ordenLabelById = useMemo(
    () => new Map(ordenesList.map(orden => [orden.id, orden.codigo_orden || `Orden #${orden.id}`])),
    [ordenesList]
  );

  const usuarioLabelById = useMemo(
    () => new Map(
      usuariosList.map(usuario => [
        usuario.id,
        `${usuario.nombre} ${usuario.apellido ?? ''}`.trim() || usuario.email || `Usuario #${usuario.id}`,
      ])
    ),
    [usuariosList]
  );

  const sortedMateriasForConfig = useMemo(
    () => [...materiasList].sort((left, right) => left.nombre.localeCompare(right.nombre)),
    [materiasList]
  );

  const availableMateriasForPieceForm = useMemo(() => {
    const alreadyAddedIds = new Set(
      materialesForm
        .map(material => material.materia_prima_id)
        .filter((id): id is number => typeof id === 'number')
    );

    // Catálogo disponible para el selector: solo habilitadas y no repetidas en el formulario actual.
    return materiasList
      .filter(materia => isMateriaEnabledForPiezas(materia) && !alreadyAddedIds.has(materia.id))
      .sort((left, right) => left.nombre.localeCompare(right.nombre));
  }, [materiasList, materialesForm]);

  const usedMateriasBeingDisabled = useMemo(() => {
    const enabledDraft = new Set(materialConfigEnabledIds);

    // Detecta impacto antes de guardar configuración para advertir sobre piezas existentes.
    return materiasList.filter(
      materia =>
        isMateriaEnabledForPiezas(materia) &&
        !enabledDraft.has(materia.id) &&
        (materia.piezas_usage_count ?? 0) > 0
    );
  }, [materiasList, materialConfigEnabledIds]);

  const disabledMateriasInCurrentPiece = useMemo(() => {
    return materialesForm
      .map(material => material.materia_prima)
      .filter((materia): materia is MateriaPrima => Boolean(materia) && materia.enabled_for_piezas === false)
      .map(materia => materia.nombre);
  }, [materialesForm]);

  /** Formatea fechas con hora para eventos del historial y trazabilidad. */
  const formatFechaHora = (fecha?: string | null) => {
    if (!fecha) return '—';

    const date = new Date(fecha);

    if (Number.isNaN(date.getTime())) return fecha;

    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: BOGOTA_TIMEZONE,
    }).format(date);
  };

  /** Formatea fechas simples para campos operativos y tablas. */
  const formatFecha = (fecha?: string | null) => {
    if (!fecha) return '—';

    const [year, month, day] = fecha.split('-');

    if (!year || !month || !day) return fecha;

    return `${day}/${month}/${year}`;
  };

  const formatHistorialValue = (field: string, value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '') return 'No registrado';

    if ((field === 'fecha_gelcoat' || field === 'fecha_qc') && typeof value === 'string') {
      return formatFecha(value);
    }

    if (field === 'orden_id') {
      const id = Number(value);
      return ordenLabelById.get(id) || `Orden #${id}`;
    }

    if (field === 'usuario_id') {
      const id = Number(value);
      return usuarioLabelById.get(id) || `Usuario #${id}`;
    }

    if (field === 'peso_real') {
      return `${value} kg`;
    }

    return String(value);
  };

  const formatMaterialCantidad = (value: string | null | undefined) => value ?? 'No registrado';

  const term = search.toLowerCase();

  // Filtra piezas por texto y por ventana temporal de control de calidad.
  const filtered = piezasList.filter(p => {
    const matchSearch =
      (p.nombre ?? '').toLowerCase().includes(term) ||
      (p.trace_id ?? '').toLowerCase().includes(term) ||
      (p.orden?.codigo_orden ?? '').toLowerCase().includes(term) ||
      (p.orden?.proyecto?.nombre ?? '').toLowerCase().includes(term);

    const fechaFiltro = p.fecha_qc;

const matchFechas =
  !fechaInicio && !fechaFin
    ? true
    : Boolean(fechaFiltro) &&
      (!fechaInicio || fechaFiltro >= fechaInicio) &&
      (!fechaFin || fechaFiltro <= fechaFin);

    return matchSearch && matchFechas;
  });

  // Calcula el valor comparable por columna, incluyendo costo derivado y estado.
  const sorted = [...filtered].sort((left, right) => {
    const leftCosto = calcularCostoPieza(left);
    const rightCosto = calcularCostoPieza(right);

    // Normaliza valor comparable por columna para usar un único comparador de ordenamiento.
    const leftValue =
      sortField === 'proyecto'
        ? (left.orden?.proyecto?.nombre ?? '').toLowerCase()
        : sortField === 'orden'
          ? (left.orden?.codigo_orden ?? '').toLowerCase()
          : sortField === 'peso_real'
            ? left.peso_real ?? 0
            : sortField === 'costo'
              ? leftCosto
              : sortField === 'estado'
                ? (left.fecha_qc ? 'completada' : 'en proceso')
                : sortField === 'fecha_gelcoat'
                  ? left.fecha_gelcoat ?? ''
                  : sortField === 'fecha_qc'
                    ? left.fecha_qc ?? ''
                    : (left[sortField] ?? '').toString().toLowerCase();

    const rightValue =
      sortField === 'proyecto'
        ? (right.orden?.proyecto?.nombre ?? '').toLowerCase()
        : sortField === 'orden'
          ? (right.orden?.codigo_orden ?? '').toLowerCase()
          : sortField === 'peso_real'
            ? right.peso_real ?? 0
            : sortField === 'costo'
              ? rightCosto
              : sortField === 'estado'
                ? (right.fecha_qc ? 'completada' : 'en proceso')
                : sortField === 'fecha_gelcoat'
                  ? right.fecha_gelcoat ?? ''
                  : sortField === 'fecha_qc'
                    ? right.fecha_qc ?? ''
                    : (right[sortField] ?? '').toString().toLowerCase();

    if (leftValue < rightValue) return sortDirection === 'asc' ? -1 : 1;
    if (leftValue > rightValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  /** Cambia la columna de orden o invierte el sentido actual. */
  const handleSort = (field: 'trace_id' | 'nombre' | 'proyecto' | 'orden' | 'fecha_gelcoat' | 'fecha_qc' | 'peso_real' | 'costo' | 'estado') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection('asc');
  };

  const renderSortableHeader = (
    label: string,
    field: 'trace_id' | 'nombre' | 'proyecto' | 'orden' | 'fecha_gelcoat' | 'fecha_qc' | 'peso_real' | 'costo' | 'estado',
    alignRight = false,
  ) => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      className={`inline-flex items-center gap-1 font-semibold text-foreground transition-colors hover:text-primary ${alignRight ? 'justify-end w-full' : ''}`}
    >
      <span>{label}</span>
      <ArrowUpDown className={`h-4 w-4 ${sortField === field ? 'text-primary' : 'text-muted-foreground'}`} />
      {sortField === field && (
        <span className="text-xs text-primary">{sortDirection === 'asc' ? 'ASC' : 'DESC'}</span>
      )}
    </button>
  );

  const openMaterialsConfig = () => {
    if (!isAdmin) {
      showAdminOnly();
      return;
    }

    setMaterialConfigEnabledIds(
      materiasList.filter(materia => isMateriaEnabledForPiezas(materia)).map(materia => materia.id)
    );
    setMaterialConfigError('');
    setOpenMaterialConfigModal(true);
  };

  const handleMaterialConfigToggle = (materiaId: number, checked: boolean | 'indeterminate') => {
    setMaterialConfigEnabledIds(prev => {
      if (checked === true) {
        if (prev.includes(materiaId)) return prev;
        return [...prev, materiaId];
      }

      return prev.filter(id => id !== materiaId);
    });
    if (materialConfigError) setMaterialConfigError('');
  };

  const saveMaterialsConfig = async () => {
    if (!isAdmin) {
      showAdminOnly();
      return;
    }

    if (materialConfigEnabledIds.length === 0) {
      setMaterialConfigError('Debes dejar al menos una materia prima habilitada para piezas.');
      return;
    }

    if (usedMateriasBeingDisabled.length > 0) {
      const warningLines = usedMateriasBeingDisabled
        .map(materia => `- ${materia.nombre} (${materia.piezas_usage_count} pieza(s))`)
        .join('\n');

      const confirmed = window.confirm(
        `Atención: estás deshabilitando materiales ya usados en piezas existentes.\n\n${warningLines}\n\n` +
          'Esto impedirá agregarlos en nuevas piezas o nuevas ediciones. ¿Deseas continuar?'
      );

      if (!confirmed) return;
    }

    setIsSavingMaterialConfig(true);
    setMaterialConfigError('');

    try {
      const updatedMaterias = await apiRequest<MateriaPrima[]>('/api/inventory/materias-primas/piezas-materiales/', {
        method: 'PUT',
        json: { enabled_materia_ids: materialConfigEnabledIds },
      });

      setMateriasList(updatedMaterias);
      setOpenMaterialConfigModal(false);
    } catch (error) {
      if (error instanceof Error && /no encontrado/i.test(error.message)) {
        setMaterialConfigError(
          'El backend activo no reconoce este endpoint todavía. Reinicia el servidor backend y vuelve a intentar.'
        );
      } else {
        setMaterialConfigError(error instanceof Error ? error.message : 'No se pudo guardar la configuración de materiales.');
      }
    } finally {
      setIsSavingMaterialConfig(false);
    }
  };

  const resetForm = () => {
    setFormData({
      trace_id: '',
      nombre: '',
      proyecto_id: '',
      orden_id: '',
      usuario_id: '',
      fecha_gelcoat: '',
      fecha_qc: '',
      peso_real: '',
    });
    setFormError('');
    setMaterialesForm([]);
    setMaterialFormData({ materia_prima_id: '', cantidad: '' });
    setMaterialFormError('');
    setOpenMaterialsModal(false);
    setEditingPieza(null);
  };

  const ordenesProyectoSeleccionado = formData.proyecto_id
    ? ordenesList.filter(orden => orden.proyecto_id === Number(formData.proyecto_id))
    : [];

  /** Resume el costo estimado del formulario a partir de sus materiales cargados. */
  const calcularCostoFormulario = () =>
    materialesForm.reduce((total, material) => {
      const cantidad = material.cantidad_real ?? material.cantidad_teorica ?? 0;
      const costo = material.materia_prima?.costo ?? 0;
      return total + cantidad * costo;
    }, 0);

  /** Agrega una materia prima al formulario evitando duplicados y cantidades invalidas. */
  const handleAddMaterial = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const materiaPrimaId = Number(materialFormData.materia_prima_id);
    const cantidad = Number(materialFormData.cantidad);

    if (!materiaPrimaId || Number.isNaN(cantidad)) {
      setMaterialFormError('Selecciona una materia prima y una cantidad válida.');
      return;
    }

    if (cantidad <= 0) {
      setMaterialFormError('La cantidad debe ser mayor que cero.');
      return;
    }

    const materiaPrima = materiasList.find(item => item.id === materiaPrimaId);

    if (!materiaPrima) {
      setMaterialFormError('Selecciona una materia prima válida.');
      return;
    }

    if (materiaPrima.enabled_for_piezas === false) {
      setMaterialFormError('Esa materia prima está deshabilitada para nuevas piezas.');
      return;
    }

    const materialExistente = materialesForm.some(
      material => material.materia_prima_id === materiaPrimaId
    );

    if (materialExistente) {
      setMaterialFormError('Ese material ya fue agregado a la pieza.');
      return;
    }

    const nextMaterialId = materialesForm.length
      ? Math.max(...materialesForm.map(material => material.id)) + 1
      : 1;

    setMaterialesForm(prev => [
      ...prev,
      {
        id: nextMaterialId,
        pieza_id: editingPieza?.id ?? null,
        materia_prima_id: materiaPrimaId,
        cantidad_teorica: cantidad,
        cantidad_real: cantidad,
        materia_prima: materiaPrima,
      },
    ]);
    setMaterialFormData({ materia_prima_id: '', cantidad: '' });
    setMaterialFormError('');
    setOpenMaterialsModal(false);
  };

  const handleRemoveMaterial = (materialId: number) => {
    setMaterialesForm(prev => prev.filter(material => material.id !== materialId));
  };

  /** Valida la pieza, sincroniza materiales y persiste alta o edicion. */
  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManage) {
      showPermissionDenied();
      return;
    }

    const traceId = formData.trace_id.trim();
    const nombre = formData.nombre.trim();
    const proyectoId = Number(formData.proyecto_id);
    const ordenId = Number(formData.orden_id);
    const usuarioId = Number(formData.usuario_id);
    const fechaGelcoat = formData.fecha_gelcoat;
    const fechaQc = formData.fecha_qc || null;
    const pesoReal = formData.peso_real ? Number(formData.peso_real) : null;

    if (!traceId || !nombre || !proyectoId || !ordenId || !usuarioId || !fechaGelcoat) {
      setFormError('Completa los campos principales de la pieza.');
      return;
    }

    if (formData.peso_real && (Number.isNaN(Number(formData.peso_real)) || Number(formData.peso_real) <= 0)) {
      setFormError('El peso real debe ser mayor que cero.');
      return;
    }

    const traceExiste = piezasList.some(
      pieza => pieza.trace_id?.toLowerCase() === traceId.toLowerCase() && pieza.id !== editingPieza?.id
    );

    if (traceExiste) {
      setFormError('Ese trace ID ya existe.');
      return;
    }

    const orden = ordenesList.find(item => item.id === ordenId);
    const usuario = usuariosList.find(item => item.id === usuarioId);

    if (!orden || !usuario || orden.proyecto_id !== proyectoId) {
      setFormError('Selecciona un proyecto, una orden y un usuario válidos.');
      return;
    }

    const payload = {
      orden_id: ordenId,
      usuario_id: usuarioId,
      trace_id: traceId,
      nombre,
      fecha_gelcoat: fechaGelcoat,
      fecha_qc: fechaQc,
      peso_real: pesoReal,
      materias_primas: materialesForm.map(material => ({
        id: material.id,
        materia_prima_id: material.materia_prima_id,
        cantidad_teorica: material.cantidad_teorica,
        cantidad_real: material.cantidad_real,
      })),
    };

    try {
      if (editingPieza) {
        const updatedPieza = await apiRequest<Pieza>(`/api/production/piezas/${editingPieza.id}/`, {
          method: 'PUT',
          json: payload,
        });
        setPiezasList(prev => prev.map(pieza => pieza.id === editingPieza.id ? updatedPieza : pieza));
        if (selected?.id === editingPieza.id) setSelected(updatedPieza);
      } else {
        const createdPieza = await apiRequest<Pieza>('/api/production/piezas/', {
          method: 'POST',
          json: payload,
        });
        setPiezasList(prev => [createdPieza, ...prev]);
      }

      await refreshProductionData();
      resetForm();
      setOpenCreate(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar la pieza.');
    }
  };

  const handleEdit = (pieza: Pieza) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    setEditingPieza(pieza);
    setFormData({
      trace_id: pieza.trace_id ?? '',
      nombre: pieza.nombre ?? '',
      proyecto_id: String(pieza.orden?.proyecto_id ?? ''),
      orden_id: String(pieza.orden_id ?? ''),
      usuario_id: String(pieza.usuario_id ?? ''),
      fecha_gelcoat: pieza.fecha_gelcoat ?? '',
      fecha_qc: pieza.fecha_qc ?? '',
      peso_real: pieza.peso_real != null ? String(pieza.peso_real) : '',
    });
    setMaterialesForm(pieza.materias_primas ?? []);
    setMaterialFormData({ materia_prima_id: '', cantidad: '' });
    setMaterialFormError('');
    setFormError('');
    setOpenCreate(true);
  };

  const handleDelete = async (pieza: Pieza) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    if (!window.confirm(`¿Eliminar la pieza ${pieza.trace_id || pieza.nombre || pieza.id}?`)) return;

    try {
      await deleteEntity('pieza', pieza);
      if (selected?.id === pieza.id) {
        setSelected(null);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo eliminar la pieza.');
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

        <div className="flex flex-col gap-2 lg:min-w-[220px] lg:self-center">
          <div className="space-y-1">
            <label htmlFor="fecha-inicio" className="text-sm font-medium text-foreground">
              Fecha inicio
            </label>
            <Input
              id="fecha-inicio"
              type="date"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="fecha-fin" className="text-sm font-medium text-foreground">
              Fecha fin
            </label>
            <Input
              id="fecha-fin"
              type="date"
              value={fechaFin}
              onChange={e => setFechaFin(e.target.value)}
              min={fechaInicio || undefined}
              className="bg-background"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {isAdmin && (
            <Button type="button" variant="outline" onClick={openMaterialsConfig}>
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Configurar materiales
            </Button>
          )}

          <Button type="button" onClick={() => (canManage ? setOpenCreate(true) : showPermissionDenied())}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva pieza
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, trace ID, orden o proyecto..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{renderSortableHeader('Trace ID', 'trace_id')}</TableHead>
                <TableHead>{renderSortableHeader('Nombre', 'nombre')}</TableHead>
                <TableHead>{renderSortableHeader('Proyecto', 'proyecto')}</TableHead>
                <TableHead>{renderSortableHeader('Orden', 'orden')}</TableHead>
                <TableHead>{renderSortableHeader('Fecha Gelcoat', 'fecha_gelcoat')}</TableHead>
                <TableHead className="text-primary">{renderSortableHeader('Fecha QC', 'fecha_qc')}</TableHead>
                <TableHead>{renderSortableHeader('Peso Real', 'peso_real')}</TableHead>
                <TableHead className="text-right">{renderSortableHeader('Costo Total', 'costo', true)}</TableHead>
                <TableHead>{renderSortableHeader('Estado', 'estado')}</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sorted.map(pieza => {
                const costo = calcularCostoPieza(pieza);

                return (
                  <TableRow key={pieza.id}>
                    <TableCell className="font-mono text-sm font-medium text-primary">
                      {pieza.trace_id || '—'}
                    </TableCell>

                    <TableCell className="font-medium">{pieza.nombre || '—'}</TableCell>

                    <TableCell className="text-muted-foreground">
                      {pieza.orden?.proyecto?.nombre || '—'}
                    </TableCell>

                    <TableCell className="font-mono text-muted-foreground">
                      {pieza.orden?.codigo_orden || '—'}
                    </TableCell>

                    <TableCell className="text-muted-foreground">{formatFecha(pieza.fecha_gelcoat)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatFecha(pieza.fecha_qc)}</TableCell>
                    <TableCell>{pieza.peso_real ? `${pieza.peso_real} kg` : '—'}</TableCell>
                    <TableCell className="text-right font-semibold">${costo.toFixed(2)}</TableCell>

                    <TableCell>
                      <Badge variant={pieza.fecha_qc ? 'default' : 'secondary'}>
                        {pieza.fecha_qc ? 'Completada' : 'En proceso'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelected(pieza)}
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {canManage && (
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEdit(pieza)}
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => handleDelete(pieza)}
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={openCreate}
        onOpenChange={open => {
          setOpenCreate(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPieza ? 'Editar pieza' : 'Nueva pieza'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pr-1">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-primary">*</span> es obligatorio
            </p>
            <div className="space-y-2">
              <Label htmlFor="trace_id">Trace ID <span className="text-primary">*</span></Label>
              <Input
                id="trace_id"
                placeholder="846999"
                value={formData.trace_id}
                onChange={e => {
                  setFormData(prev => ({ ...prev, trace_id: e.target.value }));
                  if (formError) setFormError('');
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre de la pieza <span className="text-primary">*</span></Label>
              <Input
                id="nombre"
                placeholder="Ej. SM20-SLK"
                value={formData.nombre}
                onChange={e => {
                  setFormData(prev => ({ ...prev, nombre: e.target.value }));
                  if (formError) setFormError('');
                }}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Proyecto <span className="text-primary">*</span></Label>
                <Select
                  value={formData.proyecto_id}
                  onValueChange={value => {
                    setFormData(prev => ({ ...prev, proyecto_id: value, orden_id: '' }));
                    if (formError) setFormError('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {proyectosList.map(proyecto => (
                      <SelectItem key={proyecto.id} value={String(proyecto.id)}>
                        {proyecto.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Orden <span className="text-primary">*</span></Label>
                <Select
                  value={formData.orden_id}
                  onValueChange={value => {
                    setFormData(prev => ({ ...prev, orden_id: value }));
                    if (formError) setFormError('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una orden" />
                  </SelectTrigger>
                  <SelectContent>
                    {ordenesProyectoSeleccionado.map(orden => (
                      <SelectItem key={orden.id} value={String(orden.id)}>
                        {orden.codigo_orden}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Usuario responsable <span className="text-primary">*</span></Label>
                <Select
                  value={formData.usuario_id}
                  onValueChange={value => {
                    setFormData(prev => ({ ...prev, usuario_id: value }));
                    if (formError) setFormError('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    {usuariosList.map(usuario => (
                      <SelectItem key={usuario.id} value={String(usuario.id)}>
                        {usuario.nombre} {usuario.apellido}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fecha_gelcoat">Fecha gelcoat <span className="text-primary">*</span></Label>
                <Input
                  id="fecha_gelcoat"
                  type="date"
                  value={formData.fecha_gelcoat}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, fecha_gelcoat: e.target.value }));
                    if (formError) setFormError('');
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha_qc">Fecha QC</Label>
                <Input
                  id="fecha_qc"
                  type="date"
                  value={formData.fecha_qc}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, fecha_qc: e.target.value }));
                    if (formError) setFormError('');
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="peso_real">Peso real</Label>
              <Input
                id="peso_real"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.peso_real}
                onChange={e => {
                  setFormData(prev => ({ ...prev, peso_real: e.target.value }));
                  if (formError) setFormError('');
                }}
              />
            </div>

            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">Materias primas de la pieza</p>
                  <p className="text-sm text-muted-foreground">
                    Agrega los materiales y la cantidad para calcular el costo total.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenMaterialsModal(true)}
                  disabled={availableMateriasForPieceForm.length === 0}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Añadir materiales
                </Button>
              </div>

              {disabledMateriasInCurrentPiece.length > 0 && (
                <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="font-semibold">Atención: esta pieza incluye materiales deshabilitados</p>
                  <p className="mt-1">
                    Puedes conservarlos, pero no podrás agregarlos nuevamente si los quitas.
                  </p>
                </div>
              )}

              {availableMateriasForPieceForm.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No hay materias primas habilitadas disponibles para agregar en este momento.
                </p>
              )}

              {materialesForm.length > 0 ? (
                <div className="rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Costo Unit.</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materialesForm.map(material => {
                        const cantidad = material.cantidad_real ?? material.cantidad_teorica ?? 0;
                        const costoUnitario = material.materia_prima?.costo ?? 0;
                        const subtotal = cantidad * costoUnitario;

                        return (
                          <TableRow key={material.id}>
                            <TableCell>{material.materia_prima?.nombre}</TableCell>
                            <TableCell className="text-right">
                              {cantidad} {material.materia_prima?.unidad_medida?.abreviatura}
                            </TableCell>
                            <TableCell className="text-right">${costoUnitario.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-semibold">${subtotal.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMaterial(material.id)}
                              >
                                Quitar
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Todavía no has agregado materias primas a esta pieza.
                </p>
              )}

              <div className="text-right text-sm font-semibold text-primary">
                Costo total estimado: ${calcularCostoFormulario().toFixed(2)}
              </div>
            </div>

            {formError && (
              <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setOpenCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingPieza ? 'Actualizar' : 'Guardar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openMaterialConfigModal}
        onOpenChange={open => {
          setOpenMaterialConfigModal(open);
          if (!open) {
            setMaterialConfigError('');
            setIsSavingMaterialConfig(false);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar materias primas para piezas</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
              <p className="font-medium text-foreground">Control de uso en formularios de piezas</p>
              <p className="mt-1 text-muted-foreground">
                Esta configuración define qué materias primas se pueden agregar en creación o edición de piezas.
                Los materiales deshabilitados no aparecerán en los formularios.
              </p>
            </div>

            {usedMateriasBeingDisabled.length > 0 && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                <p className="font-semibold">Advertencia crítica</p>
                <p className="mt-1">
                  Estás deshabilitando materias primas que ya se usan en piezas existentes.
                  Confirma con cuidado antes de guardar:
                </p>
                <ul className="mt-2 list-disc pl-5">
                  {usedMateriasBeingDisabled.map(materia => (
                    <li key={materia.id}>
                      {materia.nombre} ({materia.piezas_usage_count} pieza(s))
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Habilitada</TableHead>
                    <TableHead>Materia prima</TableHead>
                    <TableHead className="text-right">Uso en piezas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedMateriasForConfig.map(materia => (
                    <TableRow key={materia.id}>
                      <TableCell>
                        <Checkbox
                          checked={materialConfigEnabledIds.includes(materia.id)}
                          onCheckedChange={checked => handleMaterialConfigToggle(materia.id, checked)}
                          aria-label={`Habilitar ${materia.nombre} para piezas`}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{materia.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            Unidad: {materia.unidad_medida?.abreviatura ?? '—'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={materia.piezas_usage_count > 0 ? 'secondary' : 'outline'}>
                          {materia.piezas_usage_count} pieza(s)
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {materialConfigError && (
              <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {materialConfigError}
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Habilitadas: {materialConfigEnabledIds.length} de {materiasList.length}
              </p>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpenMaterialConfigModal(false)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={saveMaterialsConfig} disabled={isSavingMaterialConfig}>
                  {isSavingMaterialConfig ? 'Guardando...' : 'Guardar configuración'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openMaterialsModal}
        onOpenChange={open => {
          setOpenMaterialsModal(open);
          if (!open) {
            setMaterialFormData({ materia_prima_id: '', cantidad: '' });
            setMaterialFormError('');
          }
        }}
      >
        <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Añadir materiales</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddMaterial} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-primary">*</span> es obligatorio
            </p>
            <div className="space-y-2">
              <Label>Materia prima <span className="text-primary">*</span></Label>
              <Select
                value={materialFormData.materia_prima_id}
                onValueChange={value => {
                  setMaterialFormData(prev => ({ ...prev, materia_prima_id: value }));
                  if (materialFormError) setMaterialFormError('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un material" />
                </SelectTrigger>
                <SelectContent>
                  {availableMateriasForPieceForm.map(materia => (
                    <SelectItem key={materia.id} value={String(materia.id)}>
                      {materia.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableMateriasForPieceForm.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No hay materias primas habilitadas disponibles para nuevas piezas.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cantidad_material">Cantidad <span className="text-primary">*</span></Label>
              <Input
                id="cantidad_material"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={materialFormData.cantidad}
                onChange={e => {
                  setMaterialFormData(prev => ({ ...prev, cantidad: e.target.value }));
                  if (materialFormError) setMaterialFormError('');
                }}
              />
            </div>

            {materialFormError && (
              <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {materialFormError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenMaterialsModal(false)}>
                Cancelar
              </Button>
              <Button type="submit">Agregar material</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-primary">{selected?.trace_id}</span>
              <span>— {selected?.nombre}</span>
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Proyecto</p>
                  <p className="font-medium">{selected.orden?.proyecto?.nombre || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Orden</p>
                  <p className="font-medium font-mono">{selected.orden?.codigo_orden || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fecha Gelcoat</p>
                  <p className="font-medium">{formatFecha(selected.fecha_gelcoat)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fecha QC</p>
                  <p className="font-medium">{formatFecha(selected.fecha_qc)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Peso Real</p>
                  <p className="font-medium">{selected.peso_real ? `${selected.peso_real} kg` : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Peso Teórico</p>
                  <p className="font-medium">{`${calcularPesoTeoricoPieza(selected).toFixed(2)} kg`}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">Materias Primas Utilizadas</h3>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Cant. Teórica</TableHead>
                      <TableHead className="text-right">Cant. Real</TableHead>
                      <TableHead className="text-right">Costo Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {selected.materias_primas?.map(pmp => {
                      const cant = pmp.cantidad_real ?? pmp.cantidad_teorica ?? 0;
                      const subtotal = cant * (pmp.materia_prima?.costo ?? 0);

                      return (
                        <TableRow key={pmp.id}>
                          <TableCell>{pmp.materia_prima?.nombre}</TableCell>
                          <TableCell className="text-right">{pmp.cantidad_teorica}</TableCell>
                          <TableCell className="text-right">{pmp.cantidad_real ?? '—'}</TableCell>
                          <TableCell className="text-right">
                            ${(pmp.materia_prima?.costo ?? 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ${subtotal.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <div className="mt-3 text-right">
                  <span className="text-lg font-bold text-primary">
                    Total: ${calcularCostoPieza(selected).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-sm">Historial de cambios</h3>
                    <p className="text-sm text-muted-foreground">
                      Aquí se registra quién creó o editó esta pieza y cuándo lo hizo.
                    </p>
                  </div>
                </div>

                {selected.historial && selected.historial.length > 0 ? (
                  <div className="space-y-3">
                    {[...selected.historial].sort((a, b) => b.fecha.localeCompare(a.fecha)).map(item => (
                      <div key={item.id} className="rounded-lg bg-muted/40 p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={item.accion === 'creacion' ? 'default' : 'secondary'}>
                                {item.accion === 'creacion' ? 'Creación' : 'Edición'}
                              </Badge>
                              <span className="text-sm font-medium text-foreground">
                                {item.usuario ? `${item.usuario.nombre} ${item.usuario.apellido ?? ''}`.trim() : 'Usuario no disponible'}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{item.descripcion}</p>
                          </div>

                          <div className="flex flex-col items-start gap-2 sm:items-end">
                            <span className="text-sm text-muted-foreground">
                              {formatFechaHora(item.fecha)}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedHistorial(item)}
                            >
                              {item.detalle?.legacy ? 'Ver resumen' : item.accion === 'edicion' ? 'Ver cambios' : 'Ver detalle'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Esta pieza todavía no tiene historial registrado.
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedHistorial} onOpenChange={open => !open && setSelectedHistorial(null)}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del cambio</DialogTitle>
          </DialogHeader>

          {selectedHistorial && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 rounded-lg border border-border p-4 text-sm md:grid-cols-3">
                <div>
                  <p className="text-muted-foreground">Acción</p>
                  <p className="font-medium">{selectedHistorial.accion === 'creacion' ? 'Creación' : 'Edición'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Usuario</p>
                  <p className="font-medium">
                    {selectedHistorial.usuario ? `${selectedHistorial.usuario.nombre} ${selectedHistorial.usuario.apellido ?? ''}`.trim() : 'Usuario no disponible'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fecha</p>
                  <p className="font-medium">{formatFechaHora(selectedHistorial.fecha)}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">Resumen</p>
                <p className="mt-1 text-sm font-medium text-foreground">{selectedHistorial.descripcion}</p>
              </div>

              {selectedHistorial.detalle ? (
                selectedHistorial.detalle.legacy ? (
                  <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-4">
                    <h3 className="text-sm font-semibold text-amber-900">Resumen histórico</h3>
                    <p className="mt-1 text-sm text-amber-900/90">
                      Este evento se registró antes de habilitar la comparación detallada por campos.
                      Desde esta versión, los nuevos cambios ya mostrarán el antes y después completo.
                    </p>
                  </div>
                ) : (
                  <>
                    {selectedHistorial.detalle.field_changes && selectedHistorial.detalle.field_changes.length > 0 ? (
                      <div className="rounded-lg border border-border p-4">
                        <h3 className="mb-3 text-sm font-semibold">Campos modificados</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Campo</TableHead>
                              <TableHead>Antes</TableHead>
                              <TableHead>Después</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedHistorial.detalle.field_changes.map(change => (
                              <TableRow key={change.field}>
                                <TableCell className="font-medium">{change.label || historialFieldLabels[change.field] || change.field}</TableCell>
                                <TableCell>{formatHistorialValue(change.field, change.before)}</TableCell>
                                <TableCell>{formatHistorialValue(change.field, change.after)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : null}

                    {selectedHistorial.detalle.material_changes && selectedHistorial.detalle.material_changes.length > 0 ? (
                      <div className="rounded-lg border border-border p-4">
                        <h3 className="mb-3 text-sm font-semibold">Cambios en materias primas</h3>
                        <div className="space-y-3">
                          {selectedHistorial.detalle.material_changes.map((change, index) => (
                            <div key={`${change.materia_prima_id ?? 'sin-id'}-${index}`} className="rounded-lg bg-muted/40 p-3">
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="font-medium text-foreground">{change.materia_prima_nombre || 'Materia prima no disponible'}</p>
                                  <p className="text-sm text-muted-foreground">{materialChangeLabels[change.change_type]}</p>
                                </div>
                                <Badge variant="secondary">{change.materia_prima_id ? `ID ${change.materia_prima_id}` : 'Sin ID'}</Badge>
                              </div>

                              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                                <div className="rounded-md border border-border/70 bg-background p-3">
                                  <p className="mb-2 font-medium text-foreground">Antes</p>
                                  <p className="text-muted-foreground">Cant. teórica: {formatMaterialCantidad(change.before?.cantidad_teorica)}</p>
                                  <p className="text-muted-foreground">Cant. real: {formatMaterialCantidad(change.before?.cantidad_real)}</p>
                                </div>
                                <div className="rounded-md border border-border/70 bg-background p-3">
                                  <p className="mb-2 font-medium text-foreground">Después</p>
                                  <p className="text-muted-foreground">Cant. teórica: {formatMaterialCantidad(change.after?.cantidad_teorica)}</p>
                                  <p className="text-muted-foreground">Cant. real: {formatMaterialCantidad(change.after?.cantidad_real)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {selectedHistorial.detalle.accion === 'creacion' && selectedHistorial.detalle.initial ? (
                      <div className="rounded-lg border border-border p-4">
                        <h3 className="mb-3 text-sm font-semibold">Estado inicial de la pieza</h3>
                        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                          <div>
                            <p className="text-muted-foreground">Trace ID</p>
                            <p className="font-medium">{formatHistorialValue('trace_id', selectedHistorial.detalle.initial.trace_id)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Nombre</p>
                            <p className="font-medium">{formatHistorialValue('nombre', selectedHistorial.detalle.initial.nombre)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Orden</p>
                            <p className="font-medium">{formatHistorialValue('orden_id', selectedHistorial.detalle.initial.orden_id)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Usuario responsable</p>
                            <p className="font-medium">{formatHistorialValue('usuario_id', selectedHistorial.detalle.initial.usuario_id)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Fecha gelcoat</p>
                            <p className="font-medium">{formatHistorialValue('fecha_gelcoat', selectedHistorial.detalle.initial.fecha_gelcoat)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Fecha QC</p>
                            <p className="font-medium">{formatHistorialValue('fecha_qc', selectedHistorial.detalle.initial.fecha_qc)}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {selectedHistorial.detalle.accion === 'edicion' &&
                    (!selectedHistorial.detalle.field_changes?.length && !selectedHistorial.detalle.material_changes?.length) ? (
                      <p className="text-sm text-muted-foreground">
                        No se detectaron cambios en los campos principales ni en las materias primas para esta edición.
                      </p>
                    ) : null}
                  </>
                )
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay detalle disponible para este registro de historial.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}