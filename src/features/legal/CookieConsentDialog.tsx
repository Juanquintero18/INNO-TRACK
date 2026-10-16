/**
 * Aviso que pide aceptar la política de cookies la primera vez que el usuario
 * entra al sistema (y cada vez que la política cambia de versión).
 *
 * No se puede cerrar sin decidir: se acepta o se cierra la sesión.
 */
import { Cookie } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FormError } from '@/components/form/FormParts';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useCookieConsent } from './useCookieConsent';

export function CookieConsentDialog() {
  const { logout } = useAuth();
  const { isPending, isSaving, error, accept } = useCookieConsent();

  return (
    <AlertDialog open={isPending}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Cookie className="h-5 w-5 text-primary" />
            Política de cookies
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                INNO-TRACK guarda en tu navegador solo lo necesario para mantener tu sesión iniciada. No usa cookies de
                publicidad ni de analítica.
              </p>
              <p>
                Antes de continuar, lee la{' '}
                <Link to="/cookies" target="_blank" rel="noreferrer" className="font-medium text-primary underline">
                  política de cookies
                </Link>{' '}
                y acéptala.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <FormError message={error} />

        <AlertDialogFooter>
          <Button type="button" variant="outline" onClick={logout} disabled={isSaving}>
            Cerrar sesión
          </Button>
          <Button type="button" onClick={() => void accept()} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Aceptar y continuar'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
