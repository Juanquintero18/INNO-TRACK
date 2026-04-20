import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiRequest, clearAccessToken, setAccessToken } from '@/lib/api';
import type { Usuario } from '@/lib/types';

export type AppModule =
  | 'dashboard'
  | 'piezas'
  | 'inventario'
  | 'materias-primas'
  | 'proveedores'
  | 'trabajadores'
  | 'usuarios'
  | 'auditoria';

interface AuthContextType {
  user: Usuario | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  isAdmin: boolean;
  isLoading: boolean;
  canAccessModule: (module: AppModule) => boolean;
  canEditModule: (module: AppModule) => boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAdmin = user?.rol === 'administrador';

  const workerViewModules: AppModule[] = [
    'dashboard',
    'piezas',
    'inventario',
    'materias-primas',
    'trabajadores',
  ];

  const workerEditModules: AppModule[] = ['dashboard', 'piezas'];

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const currentUser = await apiRequest<Usuario>('/api/me/');
        setUser(currentUser);
      } catch {
        clearAccessToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const login = async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const response = await apiRequest<{ access: string; user: Usuario }>('/api/auth/login/', {
        method: 'POST',
        json: { email, password },
        omitAuth: true,
      });
      setAccessToken(response.access);
      setUser(response.user);
      return { ok: true };
    } catch (error) {
      clearAccessToken();
      setUser(null);

      if (error instanceof Error) {
        return { ok: false, error: error.message };
      }

      return { ok: false, error: 'No se pudo iniciar sesión.' };
    }
  };

  const logout = () => {
    clearAccessToken();
    setUser(null);
  };

  const canAccessModule = (module: AppModule) => {
    if (!user) return false;
    if (isAdmin) return true;
    return workerViewModules.includes(module);
  };

  const canEditModule = (module: AppModule) => {
    if (!user) return false;
    if (isAdmin) return true;
    return workerEditModules.includes(module);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isLoading, canAccessModule, canEditModule }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
