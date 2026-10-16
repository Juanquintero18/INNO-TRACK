/**
 * Estado de aceptación de la política de cookies del usuario que inició sesión.
 *
 * La aceptación se guarda en el backend, así que sirve en cualquier equipo y
 * vuelve a pedirse cuando la política cambia de versión.
 */
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, ENDPOINTS } from '@/lib/api';
import type { EstadoPoliticas } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';

export function useCookieConsent() {
  const { user } = useAuth();
  const [isPending, setIsPending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsPending(false);
    if (!user) return;

    let cancelled = false;

    apiRequest<EstadoPoliticas>(ENDPOINTS.politicas)
      .then(estado => {
        if (!cancelled) setIsPending(!estado.cookies.aceptada);
      })
      // Si no se puede consultar el estado, no se bloquea el uso del sistema.
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [user]);

  const accept = async () => {
    setIsSaving(true);
    setError('');

    try {
      await apiRequest<EstadoPoliticas>(ENDPOINTS.aceptarPoliticaCookies, { method: 'POST' });
      setIsPending(false);
    } catch (acceptError) {
      setError(getErrorMessage(acceptError, 'No se pudo registrar la aceptación. Intenta de nuevo.'));
    } finally {
      setIsSaving(false);
    }
  };

  return { isPending, isSaving, error, accept };
}
