/**
 * Lógica del formulario de alta y edición de órdenes de producción.
 */
import { useState, type FormEvent } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { useFormState } from '@/hooks/useFormState';
import { useModulePermission } from '@/hooks/useModulePermission';
import { ENDPOINTS, saveResource } from '@/lib/api';
import type { Orden } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';

const buildEmptyForm = (proyectoId: number | null) => ({
  proyecto_id: proyectoId ? String(proyectoId) : '',
  codigo_orden: '',
  fecha_creacion: '',
  estado: 'abierta',
});

interface UseOrdenFormOptions {
  /** Proyecto seleccionado en pantalla: es el que se propone al crear una orden. */
  selectedProyectoId: number | null;
  /** Se invoca con el proyecto de la orden guardada, para dejarlo seleccionado. */
  onSaved: (proyectoId: number) => void;
}

export function useOrdenForm({ selectedProyectoId, onSaved }: UseOrdenFormOptions) {
  const { proyectosList, ordenesList, setOrdenesList } = useAppData();
  const { canManage, showPermissionDenied } = useModulePermission('proyectos');
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Orden | null>(null);
  const form = useFormState(buildEmptyForm(null));

  const reset = () => {
    form.reset(buildEmptyForm(selectedProyectoId));
    setEditing(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) reset();
  };

  const openNew = () => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    if (proyectosList.length === 0) {
      window.alert('Primero debes crear al menos un proyecto para registrar ordenes.');
      return;
    }

    reset();
    setIsOpen(true);
  };

  const openEdit = (orden: Orden) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    setEditing(orden);
    form.reset({
      proyecto_id: orden.proyecto_id != null ? String(orden.proyecto_id) : '',
      codigo_orden: orden.codigo_orden ?? '',
      fecha_creacion: orden.fecha_creacion ?? '',
      estado: orden.estado ?? 'abierta',
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManage) {
      showPermissionDenied();
      return;
    }

    const proyectoId = Number(form.values.proyecto_id);
    const codigoOrden = form.values.codigo_orden.trim();
    const fechaCreacion = form.values.fecha_creacion;
    const estado = form.values.estado.trim();

    if (!proyectoId || Number.isNaN(proyectoId)) {
      form.setError('Debes seleccionar un proyecto.');
      return;
    }

    if (!codigoOrden) {
      form.setError('El codigo de la orden es obligatorio.');
      return;
    }

    if (!proyectosList.some(proyecto => proyecto.id === proyectoId)) {
      form.setError('Selecciona un proyecto valido.');
      return;
    }

    // El código de orden se exige único dentro del mismo proyecto.
    const codigoDuplicado = ordenesList.some(
      orden =>
        orden.proyecto_id === proyectoId &&
        (orden.codigo_orden ?? '').toLowerCase() === codigoOrden.toLowerCase() &&
        orden.id !== editing?.id
    );

    if (codigoDuplicado) {
      form.setError('Ese codigo de orden ya existe dentro del proyecto seleccionado.');
      return;
    }

    try {
      const saved = await saveResource<Orden>(ENDPOINTS.ordenes, editing?.id, {
        proyecto_id: proyectoId,
        codigo_orden: codigoOrden,
        fecha_creacion: fechaCreacion || null,
        estado: estado || null,
      });

      if (editing) {
        setOrdenesList(prev => prev.map(orden => (orden.id === editing.id ? saved : orden)));
      } else {
        setOrdenesList(prev => [saved, ...prev]);
      }

      onSaved(proyectoId);
      setIsOpen(false);
      reset();
    } catch (error) {
      form.setError(getErrorMessage(error, 'No se pudo guardar la orden.'));
    }
  };

  return {
    isOpen,
    isEditing: editing !== null,
    values: form.values,
    error: form.error,
    setField: form.setField,
    proyectosList,
    close: () => setIsOpen(false),
    openNew,
    openEdit,
    handleOpenChange,
    handleSubmit,
  };
}

export type OrdenFormController = ReturnType<typeof useOrdenForm>;
