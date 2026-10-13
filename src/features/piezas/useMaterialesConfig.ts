/**
 * Lógica de la configuración que define qué materias primas se pueden agregar
 * a las piezas. Solo la usa el administrador.
 */
import { useMemo, useState } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, ENDPOINTS } from '@/lib/api';
import { isMateriaEnabledForPiezas } from '@/lib/domain-utils';
import type { MateriaPrima } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';

export function useMaterialesConfig() {
  const { isAdmin } = useAuth();
  const { materiasList, setMateriasList } = useAppData();
  const [isOpen, setIsOpen] = useState(false);
  const [enabledIds, setEnabledIds] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const showAdminOnly = () => {
    window.alert('Solo el administrador puede configurar los materiales habilitados para piezas.');
  };

  const sortedMaterias = useMemo(
    () => [...materiasList].sort((left, right) => left.nombre.localeCompare(right.nombre)),
    [materiasList]
  );

  // Detecta impacto antes de guardar configuración para advertir sobre piezas existentes.
  const usedMateriasBeingDisabled = useMemo(() => {
    const enabledDraft = new Set(enabledIds);

    return materiasList.filter(
      materia =>
        isMateriaEnabledForPiezas(materia) && !enabledDraft.has(materia.id) && (materia.piezas_usage_count ?? 0) > 0
    );
  }, [materiasList, enabledIds]);

  const open = () => {
    if (!isAdmin) {
      showAdminOnly();
      return;
    }

    setEnabledIds(materiasList.filter(isMateriaEnabledForPiezas).map(materia => materia.id));
    setError('');
    setIsOpen(true);
  };

  const handleOpenChange = (next: boolean) => {
    setIsOpen(next);
    if (!next) {
      setError('');
      setIsSaving(false);
    }
  };

  const toggle = (materiaId: number, checked: boolean | 'indeterminate') => {
    setEnabledIds(prev => {
      if (checked === true) {
        return prev.includes(materiaId) ? prev : [...prev, materiaId];
      }

      return prev.filter(id => id !== materiaId);
    });
    if (error) setError('');
  };

  const save = async () => {
    if (!isAdmin) {
      showAdminOnly();
      return;
    }

    if (enabledIds.length === 0) {
      setError('Debes dejar al menos una materia prima habilitada para piezas.');
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

    setIsSaving(true);
    setError('');

    try {
      const updatedMaterias = await apiRequest<MateriaPrima[]>(`${ENDPOINTS.materiasPrimas}piezas-materiales/`, {
        method: 'PUT',
        json: { enabled_materia_ids: enabledIds },
      });

      setMateriasList(updatedMaterias);
      setIsOpen(false);
    } catch (saveError) {
      // Un backend sin reiniciar responde 404 porque aún no conoce este endpoint.
      if (saveError instanceof Error && /no encontrado/i.test(saveError.message)) {
        setError('El backend activo no reconoce este endpoint todavía. Reinicia el servidor backend y vuelve a intentar.');
      } else {
        setError(getErrorMessage(saveError, 'No se pudo guardar la configuración de materiales.'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isAdmin,
    isOpen,
    enabledIds,
    error,
    isSaving,
    sortedMaterias,
    usedMateriasBeingDisabled,
    totalMaterias: materiasList.length,
    open,
    close: () => setIsOpen(false),
    handleOpenChange,
    toggle,
    save,
  };
}

export type MaterialesConfigController = ReturnType<typeof useMaterialesConfig>;
