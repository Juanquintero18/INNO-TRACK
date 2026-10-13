/**
 * Lógica del formulario de alta y edición de movimientos de inventario.
 */
import { useState, type FormEvent } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { useFormState } from '@/hooks/useFormState';
import { useModulePermission } from '@/hooks/useModulePermission';
import { ENDPOINTS, saveResource } from '@/lib/api';
import { getMovementDelta } from '@/lib/domain-utils';
import type { MovimientoInventario } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';

type TipoMovimiento = MovimientoInventario['tipo'];

const EMPTY_FORM = {
  materia_prima_id: '',
  tipo: 'entrada',
  cantidad: '',
  fecha: '',
  proveedor_id: '',
  trabajador_produccion_id: '',
  motivo: '',
  referencia: '',
};

export function useMovimientoForm() {
  const { materiasList, movimientosList, setMovimientosList, proveedoresList, trabajadoresList, refreshInventoryData } =
    useAppData();
  const { canManage, showPermissionDenied } = useModulePermission('inventario');
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<MovimientoInventario | null>(null);
  const form = useFormState(EMPTY_FORM);

  const reset = () => {
    form.reset();
    setEditing(null);
  };

  /** Cerrar con la X o Escape limpia el formulario; el botón Cancelar solo lo oculta. */
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) reset();
  };

  /** Al cambiar el tipo se descarta el responsable que ya no aplica. */
  const changeTipo = (tipo: string) => {
    form.setValues(prev => ({
      ...prev,
      tipo,
      proveedor_id: tipo === 'entrada' ? prev.proveedor_id : '',
      trabajador_produccion_id: tipo === 'salida' ? prev.trabajador_produccion_id : '',
    }));
    if (form.error) form.setError('');
  };

  /** Stock que tendría la materia prima si se guarda este movimiento. */
  const getProjectedStock = (materiaPrimaId: number, tipo: TipoMovimiento, cantidad: number) => {
    const baseStock = movimientosList
      .filter(movimiento => movimiento.materia_prima_id === materiaPrimaId && movimiento.id !== editing?.id)
      .reduce((total, movimiento) => total + getMovementDelta(movimiento.tipo, movimiento.cantidad), 0);

    return baseStock + getMovementDelta(tipo, cantidad);
  };

  const openEdit = (movimiento: MovimientoInventario) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    setEditing(movimiento);
    form.reset({
      materia_prima_id: String(movimiento.materia_prima_id ?? ''),
      tipo: movimiento.tipo,
      cantidad: String(movimiento.cantidad),
      fecha: movimiento.fecha ?? '',
      proveedor_id: String(movimiento.proveedor_id ?? ''),
      trabajador_produccion_id: String(movimiento.trabajador_produccion_id ?? ''),
      motivo: movimiento.motivo ?? '',
      referencia: movimiento.referencia ?? '',
    });
    setIsOpen(true);
  };

  /** Valida reglas de negocio del movimiento y persiste la operacion. */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManage) {
      showPermissionDenied();
      return;
    }

    const materiaPrimaId = Number(form.values.materia_prima_id);
    const cantidad = Number(form.values.cantidad);
    const fecha = form.values.fecha;
    const motivo = form.values.motivo.trim() || null;
    const referencia = form.values.referencia.trim();
    const tipo = form.values.tipo as TipoMovimiento;
    const proveedorId = form.values.proveedor_id ? Number(form.values.proveedor_id) : null;
    const trabajadorId = form.values.trabajador_produccion_id ? Number(form.values.trabajador_produccion_id) : null;

    if (!materiaPrimaId || !fecha || !referencia || Number.isNaN(cantidad)) {
      form.setError('Completa los campos obligatorios del movimiento.');
      return;
    }

    if ((tipo === 'entrada' || tipo === 'salida') && cantidad <= 0) {
      form.setError('La cantidad debe ser mayor que cero.');
      return;
    }

    if (tipo === 'ajuste' && cantidad === 0) {
      form.setError('El ajuste no puede ser cero.');
      return;
    }

    const materiaPrima = materiasList.find(materia => materia.id === materiaPrimaId);

    if (!materiaPrima) {
      form.setError('Selecciona una materia prima válida.');
      return;
    }

    const projectedStock = getProjectedStock(materiaPrimaId, tipo, cantidad);

    if (projectedStock < 0) {
      form.setError(
        `Este movimiento dejaría el stock de ${materiaPrima.nombre} en negativo (${projectedStock.toFixed(2)}).`
      );
      return;
    }

    try {
      // El proveedor solo aplica a entradas y el trabajador solo a salidas.
      const saved = await saveResource<MovimientoInventario>(ENDPOINTS.movimientos, editing?.id, {
        materia_prima_id: materiaPrimaId,
        proveedor_id: tipo === 'entrada' ? proveedorId : null,
        trabajador_produccion_id: tipo === 'salida' ? trabajadorId : null,
        tipo,
        cantidad,
        fecha,
        motivo,
        referencia,
      });

      if (editing) {
        setMovimientosList(prev => prev.map(movimiento => (movimiento.id === editing.id ? saved : movimiento)));
      } else {
        setMovimientosList(prev => [saved, ...prev]);
      }

      await refreshInventoryData();
      reset();
      setIsOpen(false);
    } catch (error) {
      form.setError(getErrorMessage(error, 'No se pudo guardar el movimiento.'));
    }
  };

  return {
    isOpen,
    isEditing: editing !== null,
    values: form.values,
    error: form.error,
    setField: form.setField,
    changeTipo,
    materiasList,
    proveedoresList,
    trabajadoresList,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    openEdit,
    handleOpenChange,
    handleSubmit,
  };
}

export type MovimientoFormController = ReturnType<typeof useMovimientoForm>;
