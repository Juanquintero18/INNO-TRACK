/**
 * Lógica del formulario de alta y edición de proyectos.
 */
import { useState, type FormEvent } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { useFormState } from '@/hooks/useFormState';
import { useModulePermission } from '@/hooks/useModulePermission';
import { ENDPOINTS, saveResource } from '@/lib/api';
import type { Proyecto } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';

const EMPTY_FORM = {
  nombre: '',
  codigo: '',
  descripcion: '',
  fecha_inicio: '',
  fecha_fin: '',
  estado: 'planeacion',
};

interface UseProyectoFormOptions {
  /** Se invoca con el ID del proyecto recién creado, para dejarlo seleccionado. */
  onCreated: (proyectoId: number) => void;
}

export function useProyectoForm({ onCreated }: UseProyectoFormOptions) {
  const { proyectosList, setProyectosList } = useAppData();
  const { canManage, showPermissionDenied } = useModulePermission('proyectos');
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Proyecto | null>(null);
  const form = useFormState(EMPTY_FORM);

  const reset = () => {
    form.reset();
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

    reset();
    setIsOpen(true);
  };

  const openEdit = (proyecto: Proyecto) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    setEditing(proyecto);
    form.reset({
      nombre: proyecto.nombre ?? '',
      codigo: proyecto.codigo ?? '',
      descripcion: proyecto.descripcion ?? '',
      fecha_inicio: proyecto.fecha_inicio ?? '',
      fecha_fin: proyecto.fecha_fin ?? '',
      estado: proyecto.estado ?? 'planeacion',
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManage) {
      showPermissionDenied();
      return;
    }

    const nombre = form.values.nombre.trim();
    const codigo = form.values.codigo.trim();
    const descripcion = form.values.descripcion.trim();
    const fechaInicio = form.values.fecha_inicio;
    const fechaFin = form.values.fecha_fin;
    const estado = form.values.estado.trim();

    if (!nombre) {
      form.setError('El nombre del proyecto es obligatorio.');
      return;
    }

    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
      form.setError('La fecha fin no puede ser anterior a la fecha inicio.');
      return;
    }

    const codigoDuplicado =
      Boolean(codigo) &&
      proyectosList.some(
        proyecto => (proyecto.codigo ?? '').toLowerCase() === codigo.toLowerCase() && proyecto.id !== editing?.id
      );

    if (codigoDuplicado) {
      form.setError('Ese codigo de proyecto ya existe.');
      return;
    }

    try {
      // Los campos opcionales vacíos se envían como null, no como texto vacío.
      const saved = await saveResource<Proyecto>(ENDPOINTS.proyectos, editing?.id, {
        nombre,
        codigo: codigo || null,
        descripcion: descripcion || null,
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        estado: estado || null,
      });

      if (editing) {
        setProyectosList(prev => prev.map(proyecto => (proyecto.id === editing.id ? saved : proyecto)));
      } else {
        setProyectosList(prev => [saved, ...prev]);
        onCreated(saved.id);
      }

      setIsOpen(false);
      reset();
    } catch (error) {
      form.setError(getErrorMessage(error, 'No se pudo guardar el proyecto.'));
    }
  };

  return {
    isOpen,
    isEditing: editing !== null,
    values: form.values,
    error: form.error,
    setField: form.setField,
    close: () => setIsOpen(false),
    openNew,
    openEdit,
    handleOpenChange,
    handleSubmit,
  };
}

export type ProyectoFormController = ReturnType<typeof useProyectoForm>;
