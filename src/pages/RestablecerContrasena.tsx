/**
 * Pantalla para definir una contrasena nueva desde el enlace del correo.
 *
 * Lee `uid` y `token` de la URL y los envia al backend junto con la nueva
 * contrasena. El backend valida que el enlace siga vigente y no se haya usado.
 */
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Lock } from 'lucide-react';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest, ENDPOINTS } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

export default function RestablecerContrasena() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid') ?? '';
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  /** Valida que ambas contrasenas coincidan y confirma el cambio en el backend. */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest(ENDPOINTS.passwordResetConfirm, {
        method: 'POST',
        json: { uid, token, password },
        omitAuth: true,
      });
      setIsDone(true);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'No se pudo cambiar la contraseña.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!uid || !token) {
    return (
      <AuthCard title="Enlace incompleto" description="Recuperación de contraseña">
        <div className="space-y-5">
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
            Este enlace no es válido. Abre el enlace completo que recibiste por correo o solicita uno nuevo.
          </p>

          <Button asChild className="w-full h-11 text-base font-semibold">
            <Link to="/recuperar-contrasena">Solicitar un enlace nuevo</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  if (isDone) {
    return (
      <AuthCard title="Contraseña actualizada" description="Recuperación de contraseña">
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-lg bg-success/10 p-4 text-sm text-foreground">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            <p>Tu contraseña fue cambiada. Ya puedes iniciar sesión con la nueva.</p>
          </div>

          <Button asChild className="w-full h-11 text-base font-semibold">
            <Link to="/">Iniciar sesión</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Nueva contraseña" description="Elige la contraseña con la que entrarás a INNO-TRACK.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password">Nueva contraseña</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="pl-10"
              disabled={isSubmitting}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Mínimo 8 caracteres. No puede ser solo números, ni una contraseña muy común, ni parecerse a tu nombre o
            correo.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmation">Repite la contraseña</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="confirmation"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={confirmation}
              onChange={e => setConfirmation(e.target.value)}
              className="pl-10"
              disabled={isSubmitting}
              required
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>}

        <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar contraseña'}
        </Button>

        <Button asChild variant="link" className="h-auto p-0 text-sm font-medium text-primary/90">
          <Link to="/recuperar-contrasena">Solicitar un enlace nuevo</Link>
        </Button>
      </form>
    </AuthCard>
  );
}
