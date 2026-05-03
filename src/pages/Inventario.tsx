import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, getAccessToken, getApiBaseUrl } from '@/lib/api';
import type { MovimientoImportCommitResult, MovimientoImportPreview, MovimientoInventario } from '@/lib/types';
import { Search, ArrowLeftRight, Plus, Pencil, Trash2, ArrowUpDown, Info, Upload, Download, Loader2 } from 'lucide-react';

/**
 * Pantalla de movimientos de inventario.
 *
 * Reune consulta, filtros, ordenamiento y formulario para registrar entradas,
 * salidas y ajustes de materias primas dentro del sistema.
 */
type Movimiento = MovimientoInventario;

/** Orquesta la gestion visual de movimientos y su sincronizacion con la API. */
export default function Inventario() {
  const { user, canEditModule } = useAuth();
  const {
    materiasList,
    movimientosList,
    setMovimientosList,
    proveedoresList,
    trabajadoresList,
    deleteEntity,
    refreshInventoryData,
  } = useAppData();
  const canManage = canEditModule('inventario');
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [sortField, setSortField] = useState<'fecha' | 'tipo' | 'material' | 'cantidad' | 'responsable' | 'motivo' | 'referencia'>('fecha');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [openCreate, setOpenCreate] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [editingMovimiento, setEditingMovimiento] = useState<Movimiento | null>(null);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<MovimientoImportPreview | null>(null);
  const [importError, setImportError] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [formData, setFormData] = useState({
    materia_prima_id: '',
    tipo: 'entrada',
    cantidad: '',
    fecha: '',
    proveedor_id: '',
    trabajador_produccion_id: '',
    motivo: '',
    referencia: '',
  });
  const [formError, setFormError] = useState('');

  const resetImportForm = () => {
    setSelectedImportFile(null);
    setImportPreview(null);
    setImportError('');
  };

  /** Mensaje comun para bloquear edicion cuando el rol no lo permite. */
  const showPermissionDenied = () => {
    window.alert('No tienes permisos para editar en el módulo de Inventario.');
  };

  /** Convierte fechas ISO del backend a un formato mas legible para la tabla. */
  const formatFecha = (fecha?: string | null) => {
    if (!fecha) return '—';

    const [year, month, day] = fecha.split('-');

    if (!year || !month || !day) return fecha;

    return `${day}/${month}/${year}`;
  };

  // Aplica busqueda textual, filtro por tipo y rango opcional de fechas.
  const filtered = movimientosList.filter(m => {
    const matchSearch =
      (m.materia_prima?.nombre ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (m.referencia ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (m.motivo ?? '').toLowerCase().includes(search.toLowerCase());

    const matchTipo = tipoFilter === 'todos' || m.tipo === tipoFilter;
    const fechaFiltro = m.fecha;
    const matchFechas =
      !fechaInicio && !fechaFin
        ? true
        : Boolean(fechaFiltro) &&
          (!fechaInicio || fechaFiltro >= fechaInicio) &&
          (!fechaFin || fechaFiltro <= fechaFin);

    return matchSearch && matchTipo && matchFechas;
  });

  // Resuelve el valor comparable segun la columna activa de la tabla.
  const sorted = [...filtered].sort((left, right) => {
    const leftValue =
      sortField === 'material'
        ? (left.materia_prima?.nombre ?? '').toLowerCase()
        : sortField === 'cantidad'
          ? left.cantidad ?? 0
          : sortField === 'responsable'
            ? (left.proveedor?.nombre ?? left.trabajador?.nombre ?? '').toLowerCase()
            : sortField === 'motivo'
              ? (left.motivo ?? '').toLowerCase()
              : sortField === 'referencia'
                ? (left.referencia ?? '').toLowerCase()
                : sortField === 'tipo'
                  ? (left.tipo ?? '').toLowerCase()
                  : left.fecha ?? '';

    const rightValue =
      sortField === 'material'
        ? (right.materia_prima?.nombre ?? '').toLowerCase()
        : sortField === 'cantidad'
          ? right.cantidad ?? 0
          : sortField === 'responsable'
            ? (right.proveedor?.nombre ?? right.trabajador?.nombre ?? '').toLowerCase()
            : sortField === 'motivo'
              ? (right.motivo ?? '').toLowerCase()
              : sortField === 'referencia'
                ? (right.referencia ?? '').toLowerCase()
                : sortField === 'tipo'
                  ? (right.tipo ?? '').toLowerCase()
                  : right.fecha ?? '';

    if (leftValue < rightValue) return sortDirection === 'asc' ? -1 : 1;
    if (leftValue > rightValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  /** Actualiza el criterio de orden de la grilla. */
  const handleSort = (field: 'fecha' | 'tipo' | 'material' | 'cantidad' | 'responsable' | 'motivo' | 'referencia') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection('asc');
  };

  const renderSortableHeader = (
    label: string,
    field: 'fecha' | 'tipo' | 'material' | 'cantidad' | 'responsable' | 'motivo' | 'referencia',
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

  const resetForm = () => {
    setFormData({
      materia_prima_id: '',
      tipo: 'entrada',
      cantidad: '',
      fecha: '',
      proveedor_id: '',
      trabajador_produccion_id: '',
      motivo: '',
      referencia: '',
    });
    setFormError('');
    setEditingMovimiento(null);
  };

  const getMovementDelta = (tipo: Movimiento['tipo'], cantidad: number) => {
    if (tipo === 'entrada') return cantidad;
    if (tipo === 'salida') return -cantidad;
    return cantidad;
  };

  const getProjectedStock = (materiaPrimaId: number, tipo: Movimiento['tipo'], cantidad: number) => {
    const baseStock = movimientosList
      .filter(movimiento => movimiento.materia_prima_id === materiaPrimaId && movimiento.id !== editingMovimiento?.id)
      .reduce((total, movimiento) => total + getMovementDelta(movimiento.tipo, movimiento.cantidad), 0);

    return baseStock + getMovementDelta(tipo, cantidad);
  };

  /** Valida reglas de negocio del movimiento y persiste la operacion. */
  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManage) {
      showPermissionDenied();
      return;
    }

    const materiaPrimaId = Number(formData.materia_prima_id);
    const cantidad = Number(formData.cantidad);
    const fecha = formData.fecha;
    const motivo = formData.motivo.trim() || null;
    const referencia = formData.referencia.trim();
    const tipo = formData.tipo as Movimiento['tipo'];
    const proveedorId = formData.proveedor_id ? Number(formData.proveedor_id) : null;
    const trabajadorId = formData.trabajador_produccion_id
      ? Number(formData.trabajador_produccion_id)
      : null;

    if (!materiaPrimaId || !fecha || !referencia || Number.isNaN(cantidad)) {
      setFormError('Completa los campos obligatorios del movimiento.');
      return;
    }

    if ((tipo === 'entrada' || tipo === 'salida') && cantidad <= 0) {
      setFormError('La cantidad debe ser mayor que cero.');
      return;
    }

    if (tipo === 'ajuste' && cantidad === 0) {
      setFormError('El ajuste no puede ser cero.');
      return;
    }

    const materiaPrima = materiasList.find(materia => materia.id === materiaPrimaId);

    if (!materiaPrima) {
      setFormError('Selecciona una materia prima válida.');
      return;
    }

    const projectedStock = getProjectedStock(materiaPrimaId, tipo, cantidad);

    if (projectedStock < 0) {
      setFormError(`Este movimiento dejaría el stock de ${materiaPrima.nombre} en negativo (${projectedStock.toFixed(2)}).`);
      return;
    }

    const proveedor = tipo === 'entrada'
      ? proveedoresList.find(item => item.id === proveedorId)
      : undefined;
    const trabajador = tipo === 'salida'
      ? trabajadoresList.find(item => item.id === trabajadorId)
      : undefined;

    const payload = {
      materia_prima_id: materiaPrimaId,
      proveedor_id: tipo === 'entrada' ? proveedorId : null,
      trabajador_produccion_id: tipo === 'salida' ? trabajadorId : null,
      tipo,
      cantidad,
      fecha,
      motivo,
      referencia,
    };

    try {
      if (editingMovimiento) {
        const updatedMovimiento = await apiRequest<MovimientoInventario>(`/api/inventory/movimientos/${editingMovimiento.id}/`, {
          method: 'PUT',
          json: payload,
        });
        setMovimientosList(prev => prev.map(movimiento => movimiento.id === editingMovimiento.id ? updatedMovimiento : movimiento));
      } else {
        const createdMovimiento = await apiRequest<MovimientoInventario>('/api/inventory/movimientos/', {
          method: 'POST',
          json: payload,
        });
        setMovimientosList(prev => [createdMovimiento, ...prev]);
      }

      await refreshInventoryData();
      resetForm();
      setOpenCreate(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar el movimiento.');
    }
  };

  const handleEdit = (movimiento: Movimiento) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    setEditingMovimiento(movimiento);
    setFormData({
      materia_prima_id: String(movimiento.materia_prima_id ?? ''),
      tipo: movimiento.tipo,
      cantidad: String(movimiento.cantidad),
      fecha: movimiento.fecha ?? '',
      proveedor_id: String(movimiento.proveedor_id ?? ''),
      trabajador_produccion_id: String(movimiento.trabajador_produccion_id ?? ''),
      motivo: movimiento.motivo ?? '',
      referencia: movimiento.referencia ?? '',
    });
    setFormError('');
    setOpenCreate(true);
  };

  const handleDelete = async (movimiento: Movimiento) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    if (!window.confirm(`¿Eliminar el movimiento ${movimiento.referencia || movimiento.id}?`)) return;

    try {
      await deleteEntity('movimiento-inventario', movimiento);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo eliminar el movimiento.');
    }
  };

  const handleImportFileChange = (file: File | null) => {
    setSelectedImportFile(file);
    setImportPreview(null);
    setImportError('');
  };

  const buildImportRequest = (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    return fetch(`${getApiBaseUrl()}/api/inventory/movimientos/import/preview/`, {
      method: 'POST',
      headers: {
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      },
      body: formData,
    });
  };

  const handleTemplateDownload = async () => {
    setIsDownloadingTemplate(true);
    setImportError('');

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/inventory/movimientos/import/template/`, {
        headers: {
          ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('No se pudo descargar la plantilla de movimientos.');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'plantilla_movimientos_inventario.xlsx';
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'No se pudo descargar la plantilla.');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedImportFile) {
      setImportError('Selecciona un archivo Excel o CSV antes de analizarlo.');
      return;
    }

    setIsPreviewLoading(true);
    setImportError('');

    try {
      const response = await buildImportRequest(selectedImportFile);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(typeof payload?.detail === 'string' ? payload.detail : 'No se pudo analizar el archivo.');
      }

      setImportPreview(payload as MovimientoImportPreview);
    } catch (error) {
      setImportPreview(null);
      setImportError(error instanceof Error ? error.message : 'No se pudo analizar el archivo.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedImportFile || !importPreview?.can_import) {
      return;
    }

    setIsImporting(true);
    setImportError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedImportFile);

      const response = await fetch(`${getApiBaseUrl()}/api/inventory/movimientos/import/commit/`, {
        method: 'POST',
        headers: {
          ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
        },
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        if (payload?.preview) {
          setImportPreview(payload.preview as MovimientoImportPreview);
        }
        throw new Error('Corrige los errores del archivo antes de importar definitivamente.');
      }

      const result = payload as MovimientoImportCommitResult;
      await refreshInventoryData();
      setOpenImport(false);
      resetImportForm();
      window.alert(`Se importaron ${result.created_count} movimientos correctamente.`);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'No se pudo completar la importación.');
    } finally {
      setIsImporting(false);
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

        {canManage && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
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

              <Button
                type="button"
                onClick={() => setOpenImport(true)}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Importar Excel
              </Button>
            </div>

            <Button type="button" onClick={() => setOpenCreate(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo registro
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por material, referencia..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="salida">Salida</SelectItem>
                <SelectItem value="ajuste">Ajuste</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{renderSortableHeader('Fecha', 'fecha')}</TableHead>
                <TableHead>{renderSortableHeader('Tipo', 'tipo')}</TableHead>
                <TableHead>{renderSortableHeader('Material', 'material')}</TableHead>
                <TableHead className="text-right">{renderSortableHeader('Cantidad', 'cantidad', true)}</TableHead>
                <TableHead>{renderSortableHeader('Proveedor / Trabajador', 'responsable')}</TableHead>
                <TableHead>{renderSortableHeader('Motivo', 'motivo')}</TableHead>
                <TableHead>{renderSortableHeader('Referencia', 'referencia')}</TableHead>
                {canManage && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>

            <TableBody>
              {sorted.map(mov => (
                <TableRow key={mov.id}>
                  <TableCell className="text-muted-foreground">{formatFecha(mov.fecha)}</TableCell>

                  <TableCell>
                    <Badge
                      variant={
                        mov.tipo === 'entrada'
                          ? 'default'
                          : mov.tipo === 'salida'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {mov.tipo}
                    </Badge>
                  </TableCell>

                  <TableCell className="font-medium">{mov.materia_prima?.nombre}</TableCell>

                  <TableCell className="text-right font-semibold">
                    {mov.tipo === 'salida' ? '-' : ''}
                    {mov.cantidad} {mov.materia_prima?.unidad_medida?.abreviatura}
                  </TableCell>

                  <TableCell className="text-muted-foreground">
                    {mov.proveedor?.nombre || mov.trabajador?.nombre || '—'}
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {mov.motivo || '—'}
                  </TableCell>

                  <TableCell className="font-mono text-xs">{mov.referencia || '—'}</TableCell>

                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(mov)}
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDelete(mov)}
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={openImport}
        onOpenChange={open => {
          setOpenImport(open);
          if (!open) resetImportForm();
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Importar Excel de movimientos</DialogTitle>
            <DialogDescription>
              Sube un archivo .xlsx, .xls o .csv, revisa la vista previa y confirma la importación solo cuando no haya errores.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleImportSubmit} className="space-y-4">
            <div className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50/50 p-4">
              <p className="text-sm font-medium text-emerald-950">Recomendación antes de importar</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Usa una sola tabla por hoja, encabezados claros y evita filas vacías, celdas combinadas o datos ambiguos.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                onClick={handleTemplateDownload}
                disabled={isDownloadingTemplate}
              >
                {isDownloadingTemplate ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Descargar plantilla ejemplo
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inventario-import-file">Archivo Excel</Label>
              <Input
                id="inventario-import-file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={e => handleImportFileChange(e.target.files?.[0] ?? null)}
              />
              <p className="text-sm text-muted-foreground">
                {selectedImportFile
                  ? `Archivo listo para analizar: ${selectedImportFile.name}`
                  : 'Selecciona el archivo que deseas validar antes de importarlo.'}
              </p>
            </div>

            {importError && (
              <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {importError}
              </p>
            )}

            {importPreview && (
              <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border bg-background p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Filas totales</p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">{importPreview.total_rows}</p>
                  </div>
                  <div className="rounded-lg border bg-background p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Válidas</p>
                    <p className="mt-1 text-2xl font-semibold text-emerald-700">{importPreview.valid_rows}</p>
                  </div>
                  <div className="rounded-lg border bg-background p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Con error</p>
                    <p className="mt-1 text-2xl font-semibold text-destructive">{importPreview.invalid_rows}</p>
                  </div>
                </div>

                {importPreview.file_errors.length > 0 && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    {importPreview.file_errors.map(error => (
                      <p key={error}>{error}</p>
                    ))}
                  </div>
                )}

                {importPreview.header_observations.length > 0 && (
                  <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-900">
                    <p className="font-medium">Encabezados interpretados automáticamente</p>
                    <div className="mt-2 space-y-1">
                      {importPreview.header_observations.map(observation => (
                        <p key={observation}>{observation}</p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-lg border bg-background">
                  <div className="border-b px-4 py-3">
                    <p className="font-medium text-foreground">Vista previa por fila</p>
                    <p className="text-sm text-muted-foreground">
                      Revisa las filas marcadas en rojo antes de confirmar la importación.
                    </p>
                  </div>

                  <div className="max-h-[320px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fila</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Material</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Responsable</TableHead>
                          <TableHead>Referencia</TableHead>
                          <TableHead>Errores</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {importPreview.rows.map(row => (
                          <TableRow key={row.row_number}>
                            <TableCell className="font-medium">{row.row_number}</TableCell>
                            <TableCell>
                              <Badge variant={row.status === 'valid' ? 'default' : 'destructive'}>
                                {row.status === 'valid' ? 'Válida' : 'Error'}
                              </Badge>
                            </TableCell>
                            <TableCell>{(row.resolved.materia_prima ?? row.values.materia_prima) || '—'}</TableCell>
                            <TableCell>{row.values.tipo || '—'}</TableCell>
                            <TableCell>
                              {(row.resolved.proveedor ?? row.values.proveedor ?? row.resolved.trabajador ?? row.values.trabajador) || '—'}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{row.values.referencia || '—'}</TableCell>
                            <TableCell className="max-w-[260px] text-sm text-muted-foreground">
                              {row.errors.length > 0 ? row.errors.join(' ') : 'Sin observaciones'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenImport(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="outline" disabled={!selectedImportFile || isPreviewLoading || isImporting}>
                {isPreviewLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                Analizar archivo
              </Button>
              <Button
                type="button"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={handleConfirmImport}
                disabled={!importPreview?.can_import || isImporting || isPreviewLoading}
              >
                {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Importar definitivamente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openCreate}
        onOpenChange={open => {
          setOpenCreate(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingMovimiento ? 'Editar movimiento de inventario' : 'Nuevo movimiento de inventario'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-primary">*</span> es obligatorio
            </p>
            <div className="space-y-2">
              <Label>Materia prima <span className="text-primary">*</span></Label>
              <Select
                value={formData.materia_prima_id}
                onValueChange={value => {
                  setFormData(prev => ({ ...prev, materia_prima_id: value }));
                  if (formError) setFormError('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un material" />
                </SelectTrigger>
                <SelectContent>
                  {materiasList.map(materia => (
                    <SelectItem key={materia.id} value={String(materia.id)}>
                      {materia.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo <span className="text-primary">*</span></Label>
                <Select
                  value={formData.tipo}
                  onValueChange={value => {
                    setFormData(prev => ({
                      ...prev,
                      tipo: value,
                      proveedor_id: value === 'entrada' ? prev.proveedor_id : '',
                      trabajador_produccion_id: value === 'salida' ? prev.trabajador_produccion_id : '',
                    }));
                    if (formError) setFormError('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="salida">Salida</SelectItem>
                    <SelectItem value="ajuste">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cantidad">Cantidad <span className="text-primary">*</span></Label>
                <Input
                  id="cantidad"
                  type="number"
                  step="0.01"
                  placeholder={formData.tipo === 'ajuste' ? 'Ej. -2.00 o 2.00' : '0.00'}
                  value={formData.cantidad}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, cantidad: e.target.value }));
                    if (formError) setFormError('');
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha <span className="text-primary">*</span></Label>
              <Input
                id="fecha"
                type="date"
                value={formData.fecha}
                onChange={e => {
                  setFormData(prev => ({ ...prev, fecha: e.target.value }));
                  if (formError) setFormError('');
                }}
              />
            </div>

            {formData.tipo === 'entrada' && (
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Select
                  value={formData.proveedor_id}
                  onValueChange={value => {
                    setFormData(prev => ({ ...prev, proveedor_id: value }));
                    if (formError) setFormError('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {proveedoresList.map(proveedor => (
                      <SelectItem key={proveedor.id} value={String(proveedor.id)}>
                        {proveedor.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.tipo === 'salida' && (
              <div className="space-y-2">
                <Label>Trabajador</Label>
                <Select
                  value={formData.trabajador_produccion_id}
                  onValueChange={value => {
                    setFormData(prev => ({ ...prev, trabajador_produccion_id: value }));
                    if (formError) setFormError('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un trabajador" />
                  </SelectTrigger>
                  <SelectContent>
                    {trabajadoresList.map(trabajador => (
                      <SelectItem key={trabajador.id} value={String(trabajador.id)}>
                        {trabajador.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo</Label>
              <Input
                id="motivo"
                placeholder="Ej. Reposición mensual"
                value={formData.motivo}
                onChange={e => {
                  setFormData(prev => ({ ...prev, motivo: e.target.value }));
                  if (formError) setFormError('');
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="referencia">Referencia <span className="text-primary">*</span></Label>
              <Input
                id="referencia"
                placeholder="Ej. OC-2025-006"
                value={formData.referencia}
                onChange={e => {
                  setFormData(prev => ({ ...prev, referencia: e.target.value }));
                  if (formError) setFormError('');
                }}
              />
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
              <Button type="submit">{editingMovimiento ? 'Actualizar' : 'Guardar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}