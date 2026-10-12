/**
 * Tarjeta centrada con el logo para las pantallas publicas de acceso
 * (recuperar y restablecer contrasena).
 */
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import logo from '@/assets/logo-inno-transparente. RGB.png';

interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
          <div className="flex flex-col items-center mb-8 text-center">
            <img src={logo} alt="Innolution" className="w-20 h-20 rounded-xl object-contain mb-4" />
            <h1 className="text-2xl font-bold text-primary tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>

          {children}
        </div>
      </motion.div>
    </div>
  );
}
