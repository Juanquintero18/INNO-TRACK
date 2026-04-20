import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo-inno-transparente. RGB.png';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const { user } = useAuth();
  const [showTopBar, setShowTopBar] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(prev => !prev)}
      />
      <main
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'ml-[72px]' : 'ml-[260px]'
        )}
      >
        {showTopBar ? (
          <header className="sticky top-0 z-30 border-b border-border bg-background/80 px-8 py-4 backdrop-blur-md">
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setShowTopBar(false)}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <EyeOff className="h-4 w-4" />
                Ocultar panel
              </button>

              <div className="flex items-center gap-3">
                <img src={logo} alt="Innolution" className="h-14 w-14 rounded object-contain opacity-40" />
                <span className="text-sm text-muted-foreground">
                  {user?.nombre} {user?.apellido}
                </span>
              </div>
            </div>
          </header>
        ) : (
          <div className="sticky top-0 z-30 flex justify-end px-8 pt-4">
            <button
              type="button"
              onClick={() => setShowTopBar(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/90 px-3 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-muted hover:text-foreground"
            >
              <Eye className="h-4 w-4" />
              Mostrar panel
            </button>
          </div>
        )}
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
