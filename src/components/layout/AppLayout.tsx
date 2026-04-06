import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo-innolution.jfif';

export function AppLayout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-[260px] transition-all duration-300">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-8 py-4 flex items-center justify-between">
          <div />
          <div className="flex items-center gap-3">
            <img src={logo} alt="Innolution" className="w-7 h-7 rounded object-contain opacity-40" />
            <span className="text-sm text-muted-foreground">
              {user?.nombre} {user?.apellido}
            </span>
          </div>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
