import { createContext, useContext, useState, ReactNode } from 'react';
import { Usuario, usuarios } from '@/lib/mock-data';

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
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isAdmin: boolean;
  canAccessModule: (module: AppModule) => boolean;
  canEditModule: (module: AppModule) => boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const isAdmin = user?.rol === 'administrador';

  const workerViewModules: AppModule[] = [
    'dashboard',
    'piezas',
    'inventario',
    'materias-primas',
    'trabajadores',
  ];

  const workerEditModules: AppModule[] = ['dashboard', 'piezas'];

  const login = (email: string, _password: string): boolean => {
    const found = usuarios.find(u => u.email === email);
    if (found) {
      setUser(found);
      return true;
    }
    return false;
  };

  const logout = () => setUser(null);

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
    <AuthContext.Provider value={{ user, login, logout, isAdmin, canAccessModule, canEditModule }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
