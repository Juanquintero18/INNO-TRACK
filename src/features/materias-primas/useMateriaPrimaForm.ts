/**
 * Lógica del formulario de alta y edición de materias primas.
 */
import { useState, type FormEvent } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { useFormState } from '@/hooks/useFormState';
import { useModulePermission } from '@/hooks/useModulePermission';
import { ENDPOINTS, saveResource } from '@/lib/api';
import type { MateriaPrima } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';

const EMPTY_FORM = { nombre: '', unidad_medida_id: '', costo: '', fecha_actualizacion: '' };

export function useMateriaPrimaForm() {
  const { materiasList, setMateriasList, unidadesList } = useAppData();
  const { canManage, showPermissionDenied } = useModulePermission('materias-primas');
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<MateriaPrima | null>(null);
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

  const openEdit = (materia: MateriaPrima) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    setEditing(materia);
    form.reset({
      nombre: materia.nombre,
      unidad_medida_id: String(materia.unidad_medida_id ?? ''),
      costo: String(materia.costo ?? ''),
      fecha_actualizacion: materia.fecha_actualizacion ?? '',
    });
    setIsOpen(true);
  };

  /** Valida el formulario y sincroniza el alta o la edicion con la API. */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManage) {
      showPermissionDenied();
      return;
    }

    const nombre = form.values.nombre.trim();
    const unidadMedidaId = Number(form.values.unidad_medida_id);
    const costo = Number(form.values.costo);
    const fechaActualizacion = form.values.fecha_actualizacion;

    if (!nombre || !unidadMedidaId || !fechaActualizacion || Number.isNaN(costo)) {
      form.setError('Completa todos los campos de la materia prima.');
      return;
    }

    if (costo <= 0) {
      form.setError('El costo unitario debe ser mayor que cero.');
      return;
    }

    const nombreExiste = materiasList.some(
      materia => materia.nombre.toLowerCase() === nombre.toLowerCase() && materia.id !== editing?.id
    );

    if (nombreExiste) {
      form.setError('Ya existe una materia prima con ese nombre.');
      return;
    }

    if (!unidadesList.some(unidad => unidad.id === unidadMedidaId)) {
      form.setError('Selecciona una unidad de medida válida.');
      return;
    }

    try {
      const saved = await saveResource<MateriaPrima>(ENDPOINTS.materiasPrimas, editing?.id, {
        nombre,
        unidad_medida_id: unidadMedidaId,
        costo,
        fecha_actualizacion: fechaActualizacion,
      });

      if (editing) {
        setMateriasList(prev => prev.map(materia => (materia.id === editing.id ? saved : materia)));
      } else {
        setMateriasList(prev => [saved, ...prev]);
      }

      reset();
      setIsOpen(false);
    } catch (error) {
      form.setError(getErrorMessage(error, 'No se pudo guardar la materia prima.'));
    }
  };

  return {
    isOpen,
    isEditing: editing !== null,
    values: form.values,
    error: form.error,
    setField: form.setField,
    unidadesList,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    openEdit,
    handleOpenChange,
    handleSubmit,
  };
}

export type MateriaPrimaFormController = ReturnType<typeof useMateriaPrimaForm>;
