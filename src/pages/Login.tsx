/**
 * Pantalla de inicio de sesion del sistema.
 *
 * Recoge credenciales, invoca el flujo de autenticacion del contexto y redirige
 * al dashboard cuando el backend valida al usuario.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import logo from '@/assets/logo-inno-transparente. RGB.png';
import { motion } from 'framer-motion';
import { Lock, Mail } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  /** Ejecuta el login y refleja cualquier error devuelto por la API. */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);
    if (result.ok) {
      navigate('/dashboard');
    } else {
      setError(result.error ?? 'No se pudo iniciar sesión.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Button
        type="button"
        variant="ghost"
        className="fixed bottom-4 left-4 z-20 h-8 px-3 text-xs font-normal text-muted-foreground/70 bg-card/20 border border-border/40 backdrop-blur-sm hover:bg-card/40 hover:text-foreground"
      >
        Politicas de privacidad
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <img src={logo} alt="Innolution" className="w-28 h-28 rounded-xl object-contain mb-4" />
            <h1 className="text-2xl font-bold text-primary tracking-tight">INNO-TRACK</h1>
            <p className="text-sm text-muted-foreground mt-1">Sistema de Costos e Inventario</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@innolution.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>
            )}

            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isSubmitting}>
              {isSubmitting ? 'Validando...' : 'Iniciar Sesión'}
            </Button>

            <div className="flex flex-col items-start gap-1">
              <Button type="button" variant="link" className="h-auto p-0 text-sm font-medium text-primary/90">
                ¿Olvidaste tu contraseña?
              </Button>
              <Button type="button" variant="link" className="h-auto p-0 text-sm font-medium text-primary/90">
                ¿Deseas registrarte?
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
