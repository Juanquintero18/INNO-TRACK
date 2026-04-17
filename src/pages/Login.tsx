//descripcion: Página de login con formulario de autenticación, validación de credenciales y diseño moderno para el sistema de costos e inventario

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import logo from '@/assets/logo-innolution.jfif';
import { motion } from 'framer-motion';
import { Lock, Mail } from 'lucide-react';

//componente de login que maneja el estado del formulario, la autenticación y la navegación, con un diseño centrado y animaciones suaves para mejorar la experiencia del usuario


export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (login(email, password)) {
      navigate('/dashboard');
    } else {
      setError('Credenciales incorrectas. Intenta con admin@innolution.com o carlos@innolution.com');
    }
  };

// El diseño del formulario incluye un logo, campos de entrada con iconos, mensajes de error estilizados y un botón de envío, todo envuelto en un contenedor animado para una apariencia moderna y profesional

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <img src={logo} alt="Innolution" className="w-20 h-20 rounded-xl object-contain mb-4" />
            <h1 className="text-2xl font-bold text-primary tracking-tight">INNOLUTION</h1>
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
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>
            )}

            <Button type="submit" className="w-full h-11 text-base font-semibold">
              Iniciar Sesión
            </Button>
          </form>

          <div className="mt-6 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <p className="font-medium mb-1">Demo - Credenciales:</p>
            <p>Admin: admin@innolution.com</p>
            <p>Trabajador: carlos@innolution.com</p>
            <p className="mt-1 italic">Cualquier contraseña funciona</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
