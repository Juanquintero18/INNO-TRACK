/**
 * Contexto de autenticacion y autorizacion del frontend.
 *
 * Este modulo encapsula el login, el usuario actual, el estado de carga
 * inicial y las reglas de acceso por modulo para administradores y operarios.
 */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiRequest, clearAccessToken, ENDPOINTS, setAccessToken } from '@/lib/api';
import type { Usuario } from '@/lib/types';

export type AppModule =
  | 'dashboard'
  | 'proyectos'
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

const ROLE_ADMIN = 'administrador';
const ROLE_ALMACENISTA = 'almacenista';

interface ModulePermissions {
  view: AppModule[];
  edit: AppModule[];
}

const ALMACENISTA_PERMISSIONS: ModulePermissions = {
  view: ['dashboard', 'piezas', 'inventario', 'materias-primas', 'proveedores', 'trabajadores'],
  edit: ['inventario', 'proveedores', 'materias-primas'],
};

// Los operarios tienen una vista mas restringida y solo pueden editar piezas.
// Es tambien el permiso de cualquier rol que no sea administrador ni almacenista.
const TRABAJADOR_PERMISSIONS: ModulePermissions = {
  view: ['dashboard', 'piezas', 'inventario', 'materias-primas', 'trabajadores'],
  edit: ['dashboard', 'piezas'],
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

/**
 * Provider que rehidrata la sesion desde el token persistido y expone helpers
 * de autenticacion para el resto de la app.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAdmin = user?.rol === ROLE_ADMIN;
  const permissions = user?.rol === ROLE_ALMACENISTA ? ALMACENISTA_PERMISSIONS : TRABAJADOR_PERMISSIONS;

  useEffect(() => {
    // Al recargar la pagina, la app intenta recuperar el usuario a partir del
    // token guardado. Si falla, limpia la sesion local para evitar estados rotos.
    const bootstrap = async () => {
      try {
        const currentUser = await apiRequest<Usuario>(ENDPOINTS.me);
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
      // El backend retorna el token y el usuario serializado en una sola llamada.
      const response = await apiRequest<{ access: string; user: Usuario }>(ENDPOINTS.login, {
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

  /** Determina si un modulo debe mostrarse en la navegacion segun el rol. */
  const canAccessModule = (module: AppModule) => {
    if (!user) return false;
    return isAdmin || permissions.view.includes(module);
  };

  /** Determina si el usuario puede modificar datos dentro de un modulo. */
  const canEditModule = (module: AppModule) => {
    if (!user) return false;
    return isAdmin || permissions.edit.includes(module);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isLoading, canAccessModule, canEditModule }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
