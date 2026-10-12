/**
 * Pantalla para solicitar la recuperacion de contrasena.
 *
 * Pide el correo y solicita al backend el enlace de restablecimiento. El
 * mensaje final es el mismo exista o no la cuenta, para no revelar que correos
 * estan registrados.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MailCheck } from 'lucide-react';
import { AuthCard } from '@/components/AuthCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/api';

export default function RecuperarContrasena() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState('');

  /** Solicita el correo de recuperacion y muestra la confirmacion. */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await apiRequest('/api/auth/password-reset/', {
        method: 'POST',
        json: { email: email.trim() },
        omitAuth: true,
      });
      setSentTo(email.trim());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo enviar la solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <AuthCard title="Revisa tu correo" description="Recuperación de contraseña">
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-lg bg-success/10 p-4 text-sm text-foreground">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            <p>
              Si <span className="font-medium">{sentTo}</span> está registrado en INNO-TRACK, en unos minutos recibirás
              un enlace para crear una contraseña nueva.
            </p>
          </div>

          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>El enlace vence pronto (el correo indica en cuánto tiempo) y solo se puede usar una vez.</li>
            <li>Si no lo ves, revisa la carpeta de correo no deseado.</li>
            <li>Si no llega, pide ayuda al administrador del sistema.</li>
          </ul>

          <Button asChild className="w-full h-11 text-base font-semibold">
            <Link to="/">Volver a iniciar sesión</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Recuperar contraseña"
      description="Escribe tu correo y te enviaremos un enlace para crear una contraseña nueva."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="correo@innolution.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="pl-10"
              disabled={isSubmitting}
              required
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>}

        <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando...' : 'Enviar enlace'}
        </Button>

        <Button asChild variant="link" className="h-auto p-0 text-sm font-medium text-primary/90">
          <Link to="/">Volver a iniciar sesión</Link>
        </Button>
      </form>
    </AuthCard>
  );
}
