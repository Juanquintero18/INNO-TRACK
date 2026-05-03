/**
 * Sidebar de navegacion principal.
 *
 * Define enlaces distintos para administrador y operario, y tambien concentra
 * acciones globales como cerrar sesion y colapsar la navegacion.
 */
import { NavLink } from 'react-router-dom';
import type { ComponentType } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { AppModule } from '@/contexts/AuthContext';
import logo from '@/assets/logo-inno-transparente. RGB.png';
import {
  FolderKanban,
  LayoutDashboard,
  Puzzle,
  ShieldAlert,
  Package,
  ArrowLeftRight,
  Truck,
  HardHat,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const allLinks: Array<{ to: string; label: string; icon: ComponentType<{ className?: string }>; module: AppModule }> = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
  { to: '/proyectos', label: 'Proyectos', icon: FolderKanban, module: 'proyectos' },
  { to: '/piezas', label: 'Piezas', icon: Puzzle, module: 'piezas' },
  { to: '/materias-primas', label: 'Materias Primas', icon: Package, module: 'materias-primas' },
  { to: '/inventario', label: 'Inventario', icon: ArrowLeftRight, module: 'inventario' },
  { to: '/proveedores', label: 'Proveedores', icon: Truck, module: 'proveedores' },
  { to: '/trabajadores', label: 'Trabajadores', icon: HardHat, module: 'trabajadores' },
  { to: '/usuarios', label: 'Usuarios', icon: Users, module: 'usuarios' },
  { to: '/auditoria', label: 'Auditoría', icon: ShieldAlert, module: 'auditoria' },
];

type AppSidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

/** Renderiza la barra lateral fija del panel y adapta su contenido al rol. */
export function AppSidebar({ collapsed, onToggleCollapsed }: AppSidebarProps) {
  const { user, logout, canAccessModule } = useAuth();
  const links = allLinks.filter(link => canAccessModule(link.module));

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-card border-r border-border flex flex-col transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'border-b border-border px-4 py-5',
          collapsed
            ? 'flex min-h-[72px] items-center justify-center'
            : 'flex min-h-[120px] flex-col items-center justify-center gap-2 text-center'
        )}
      >
        <img src={logo} alt="Innolution" className="w-20 h-20 rounded-lg object-contain flex-shrink-0" />
        {!collapsed && (
          <span className="text-lg font-bold text-primary tracking-tight">INNO-TRACK</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User & Collapse */}
      <div className="border-t border-border p-3 space-y-2">
        {!collapsed && user && (
          <div className="px-2 py-1">
            <p className="text-sm font-medium text-foreground truncate">{user.nombre} {user.apellido}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.rol}</p>
          </div>
        )}
        <div className="flex items-center justify-between">
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
          <button
            onClick={onToggleCollapsed}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
