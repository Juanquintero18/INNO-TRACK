/**
 * Permiso de edición del usuario actual sobre un módulo, con el aviso que se
 * muestra cuando intenta editar sin tenerlo.
 */
import { useAuth, type AppModule } from '@/contexts/AuthContext';

const PERMISSION_DENIED_MESSAGES: Partial<Record<AppModule, string>> = {
  proveedores: 'No tienes permisos para editar en el módulo de Proveedores.',
  trabajadores: 'No tienes permisos para editar en el módulo de Trabajadores.',
  usuarios: 'No tienes permisos para editar en el módulo de Usuarios.',
  'materias-primas': 'No tienes permisos para editar en el módulo de Materias Primas.',
  inventario: 'No tienes permisos para editar en el módulo de Inventario.',
  piezas: 'No tienes permisos para editar en el módulo de Piezas.',
  proyectos: 'No tienes permisos para editar en el modulo de Proyectos.',
};

export function useModulePermission(module: AppModule) {
  const { canEditModule } = useAuth();
  const canManage = canEditModule(module);

  const showPermissionDenied = () => {
    window.alert(PERMISSION_DENIED_MESSAGES[module] ?? 'No tienes permisos para editar en este módulo.');
  };

  return { canManage, showPermissionDenied };
}
