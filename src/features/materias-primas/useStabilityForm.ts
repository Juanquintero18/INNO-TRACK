/**
 * Lógica del formulario que define los umbrales de estabilidad de stock de
 * una materia prima (hasta dónde es crítico y hasta dónde es bajo).
 */
import { useState, type FormEvent } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { useFormState } from '@/hooks/useFormState';
import { useModulePermission } from '@/hooks/useModulePermission';
import { apiRequest, ENDPOINTS } from '@/lib/api';
import { getMateriaPrimaStabilityThresholds } from '@/lib/domain-utils';
import type { MateriaPrima } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';

const EMPTY_FORM = { stock_critico_max: '', stock_bajo_max: '' };

export function useStabilityForm() {
  const { setMateriasList } = useAppData();
  const { canManage, showPermissionDenied } = useModulePermission('materias-primas');
  const [isOpen, setIsOpen] = useState(false);
  const [materia, setMateria] = useState<MateriaPrima | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const form = useFormState(EMPTY_FORM);

  const reset = () => {
    setMateria(null);
    form.reset();
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) reset();
  };

  const openFor = (target: MateriaPrima) => {
    const thresholds = getMateriaPrimaStabilityThresholds(target);

    setMateria(target);
    form.reset({
      stock_critico_max: String(thresholds.stock_critico_max),
      stock_bajo_max: String(thresholds.stock_bajo_max),
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManage || !materia) {
      showPermissionDenied();
      return;
    }

    const critico = Number(form.values.stock_critico_max);
    const bajo = Number(form.values.stock_bajo_max);

    if (Number.isNaN(critico) || Number.isNaN(bajo)) {
      form.setError('Completa ambos umbrales de estabilidad.');
      return;
    }

    if (critico < 0) {
      form.setError('El límite crítico no puede ser negativo.');
      return;
    }

    if (bajo <= critico) {
      form.setError('El límite de stock bajo debe ser mayor que el crítico.');
      return;
    }

    setIsSaving(true);

    try {
      const updated = await apiRequest<MateriaPrima>(`${ENDPOINTS.materiasPrimas}${materia.id}/stability-thresholds/`, {
        method: 'PUT',
        json: { stock_critico_max: critico, stock_bajo_max: bajo },
      });

      setMateriasList(prev => prev.map(item => (item.id === updated.id ? updated : item)));
      setIsOpen(false);
      reset();
    } catch (error) {
      form.setError(getErrorMessage(error, 'No se pudo guardar la configuración de estabilidad.'));
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isOpen,
    materia,
    isSaving,
    values: form.values,
    error: form.error,
    setField: form.setField,
    close: () => setIsOpen(false),
    openFor,
    handleOpenChange,
    handleSubmit,
  };
}

export type StabilityFormController = ReturnType<typeof useStabilityForm>;
