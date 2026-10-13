/**
 * Lógica del formulario de alta y edición de piezas, incluida la lista de
 * materias primas que la pieza consume.
 */
import { useMemo, useState, type FormEvent } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { useFormState } from '@/hooks/useFormState';
import { useModulePermission } from '@/hooks/useModulePermission';
import { ENDPOINTS, saveResource } from '@/lib/api';
import { calcularSubtotalMaterial, isMateriaEnabledForPiezas } from '@/lib/domain-utils';
import type { Pieza, PiezaMateriaPrima } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';

const EMPTY_FORM = {
  trace_id: '',
  nombre: '',
  proyecto_id: '',
  orden_id: '',
  usuario_id: '',
  fecha_gelcoat: '',
  fecha_qc: '',
  peso_real: '',
};

const EMPTY_MATERIAL_FORM = { materia_prima_id: '', cantidad: '' };

interface UsePiezaFormOptions {
  /** Se invoca con la pieza ya guardada cuando se edita una existente. */
  onUpdated: (pieza: Pieza) => void;
}

export function usePiezaForm({ onUpdated }: UsePiezaFormOptions) {
  const { piezasList, setPiezasList, materiasList, usuariosList, proyectosList, ordenesList, refreshProductionData } =
    useAppData();
  const { canManage, showPermissionDenied } = useModulePermission('piezas');
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Pieza | null>(null);
  const form = useFormState(EMPTY_FORM);
  const [materiales, setMateriales] = useState<PiezaMateriaPrima[]>([]);
  const [isMaterialOpen, setIsMaterialOpen] = useState(false);
  const materialForm = useFormState(EMPTY_MATERIAL_FORM);

  const reset = () => {
    form.reset();
    setMateriales([]);
    materialForm.reset();
    setIsMaterialOpen(false);
    setEditing(null);
  };

  /** Cerrar con la X o Escape limpia el formulario; el botón Cancelar solo lo oculta. */
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) reset();
  };

  const handleMaterialOpenChange = (open: boolean) => {
    setIsMaterialOpen(open);
    if (!open) materialForm.reset();
  };

  /** Las órdenes dependen del proyecto: al cambiarlo se descarta la orden elegida. */
  const changeProyecto = (proyectoId: string) => {
    form.setValues(prev => ({ ...prev, proyecto_id: proyectoId, orden_id: '' }));
    if (form.error) form.setError('');
  };

  const ordenesDelProyecto = form.values.proyecto_id
    ? ordenesList.filter(orden => orden.proyecto_id === Number(form.values.proyecto_id))
    : [];

  // Catálogo disponible para el selector: solo habilitadas y no repetidas en el formulario actual.
  const materiasDisponibles = useMemo(() => {
    const yaAgregadas = new Set(
      materiales.map(material => material.materia_prima_id).filter((id): id is number => typeof id === 'number')
    );

    return materiasList
      .filter(materia => isMateriaEnabledForPiezas(materia) && !yaAgregadas.has(materia.id))
      .sort((left, right) => left.nombre.localeCompare(right.nombre));
  }, [materiasList, materiales]);

  /** La pieza conserva materiales que ya no se pueden agregar a piezas nuevas. */
  const tieneMaterialesDeshabilitados = materiales.some(material => material.materia_prima?.enabled_for_piezas === false);

  /** Resume el costo estimado del formulario a partir de sus materiales cargados. */
  const costoEstimado = materiales.reduce((total, material) => total + calcularSubtotalMaterial(material), 0);

  /** Agrega una materia prima al formulario evitando duplicados y cantidades invalidas. */
  const addMaterial = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const materiaPrimaId = Number(materialForm.values.materia_prima_id);
    const cantidad = Number(materialForm.values.cantidad);

    if (!materiaPrimaId || Number.isNaN(cantidad)) {
      materialForm.setError('Selecciona una materia prima y una cantidad válida.');
      return;
    }

    if (cantidad <= 0) {
      materialForm.setError('La cantidad debe ser mayor que cero.');
      return;
    }

    const materiaPrima = materiasList.find(item => item.id === materiaPrimaId);

    if (!materiaPrima) {
      materialForm.setError('Selecciona una materia prima válida.');
      return;
    }

    if (materiaPrima.enabled_for_piezas === false) {
      materialForm.setError('Esa materia prima está deshabilitada para nuevas piezas.');
      return;
    }

    if (materiales.some(material => material.materia_prima_id === materiaPrimaId)) {
      materialForm.setError('Ese material ya fue agregado a la pieza.');
      return;
    }

    const nextMaterialId = materiales.length ? Math.max(...materiales.map(material => material.id)) + 1 : 1;

    setMateriales(prev => [
      ...prev,
      {
        id: nextMaterialId,
        pieza_id: editing?.id ?? null,
        materia_prima_id: materiaPrimaId,
        cantidad_teorica: cantidad,
        cantidad_real: cantidad,
        materia_prima: materiaPrima,
      },
    ]);
    materialForm.reset();
    setIsMaterialOpen(false);
  };

  const removeMaterial = (materialId: number) => {
    setMateriales(prev => prev.filter(material => material.id !== materialId));
  };

  const openEdit = (pieza: Pieza) => {
    if (!canManage) {
      showPermissionDenied();
      return;
    }

    setEditing(pieza);
    form.reset({
      trace_id: pieza.trace_id ?? '',
      nombre: pieza.nombre ?? '',
      proyecto_id: String(pieza.orden?.proyecto_id ?? ''),
      orden_id: String(pieza.orden_id ?? ''),
      usuario_id: String(pieza.usuario_id ?? ''),
      fecha_gelcoat: pieza.fecha_gelcoat ?? '',
      fecha_qc: pieza.fecha_qc ?? '',
      peso_real: pieza.peso_real != null ? String(pieza.peso_real) : '',
    });
    setMateriales(pieza.materias_primas ?? []);
    materialForm.reset();
    setIsOpen(true);
  };

  /** Valida la pieza, sincroniza materiales y persiste alta o edicion. */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManage) {
      showPermissionDenied();
      return;
    }

    const traceId = form.values.trace_id.trim();
    const nombre = form.values.nombre.trim();
    const proyectoId = Number(form.values.proyecto_id);
    const ordenId = Number(form.values.orden_id);
    const usuarioId = Number(form.values.usuario_id);
    const fechaGelcoat = form.values.fecha_gelcoat;
    const fechaQc = form.values.fecha_qc || null;
    const pesoReal = form.values.peso_real ? Number(form.values.peso_real) : null;

    if (!traceId || !nombre || !proyectoId || !ordenId || !usuarioId || !fechaGelcoat) {
      form.setError('Completa los campos principales de la pieza.');
      return;
    }

    if (pesoReal !== null && (Number.isNaN(pesoReal) || pesoReal <= 0)) {
      form.setError('El peso real debe ser mayor que cero.');
      return;
    }

    const traceExiste = piezasList.some(
      pieza => pieza.trace_id?.toLowerCase() === traceId.toLowerCase() && pieza.id !== editing?.id
    );

    if (traceExiste) {
      form.setError('Ese trace ID ya existe.');
      return;
    }

    const orden = ordenesList.find(item => item.id === ordenId);
    const usuario = usuariosList.find(item => item.id === usuarioId);

    if (!orden || !usuario || orden.proyecto_id !== proyectoId) {
      form.setError('Selecciona un proyecto, una orden y un usuario válidos.');
      return;
    }

    try {
      const saved = await saveResource<Pieza>(ENDPOINTS.piezas, editing?.id, {
        orden_id: ordenId,
        usuario_id: usuarioId,
        trace_id: traceId,
        nombre,
        fecha_gelcoat: fechaGelcoat,
        fecha_qc: fechaQc,
        peso_real: pesoReal,
        materias_primas: materiales.map(material => ({
          id: material.id,
          materia_prima_id: material.materia_prima_id,
          cantidad_teorica: material.cantidad_teorica,
          cantidad_real: material.cantidad_real,
        })),
      });

      if (editing) {
        setPiezasList(prev => prev.map(pieza => (pieza.id === editing.id ? saved : pieza)));
        onUpdated(saved);
      } else {
        setPiezasList(prev => [saved, ...prev]);
      }

      // El backend agrega el historial del cambio; se recarga para mostrarlo.
      await refreshProductionData();
      reset();
      setIsOpen(false);
    } catch (error) {
      form.setError(getErrorMessage(error, 'No se pudo guardar la pieza.'));
    }
  };

  return {
    isOpen,
    isEditing: editing !== null,
    values: form.values,
    error: form.error,
    setField: form.setField,
    changeProyecto,
    proyectosList,
    usuariosList,
    ordenesDelProyecto,
    materiales,
    materiasDisponibles,
    tieneMaterialesDeshabilitados,
    costoEstimado,
    removeMaterial,
    open: () => (canManage ? setIsOpen(true) : showPermissionDenied()),
    close: () => setIsOpen(false),
    openEdit,
    handleOpenChange,
    handleSubmit,
    material: {
      isOpen: isMaterialOpen,
      values: materialForm.values,
      error: materialForm.error,
      setField: materialForm.setField,
      open: () => setIsMaterialOpen(true),
      close: () => setIsMaterialOpen(false),
      handleOpenChange: handleMaterialOpenChange,
      handleSubmit: addMaterial,
    },
  };
}

export type PiezaFormController = ReturnType<typeof usePiezaForm>;
