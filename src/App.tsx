/**
 * Punto de entrada del frontend.
 *
 * Aqui se conectan los providers globales, el router y las rutas protegidas
 * que dividen la experiencia entre login, panel principal y modulos internos.
 */

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppDataProvider } from "@/contexts/AppDataContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Piezas from "./pages/Piezas";
import Auditoria from "./pages/Auditoria";
import MateriasPrimas from "./pages/MateriasPrimas";
import Inventario from "./pages/Inventario";
import Proveedores from "./pages/Proveedores";
import Trabajadores from "./pages/Trabajadores";
import Usuarios from "./pages/Usuarios";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * Envuelve rutas privadas y aplica dos validaciones basicas:
 * 1. El usuario debe estar autenticado.
 * 2. Algunas rutas exigen rol de administrador.
 */
function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isAdmin, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/**
 * Declara el arbol de rutas principal.
 *
 * Las rutas internas viven dentro de AppLayout para reutilizar la misma
 * estructura visual, mientras que las rutas de autenticacion se resuelven
 * fuera del layout.
 */
function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/piezas" element={<Piezas />} />
        <Route path="/auditoria" element={<ProtectedRoute adminOnly><Auditoria /></ProtectedRoute>} />
        <Route path="/materias-primas" element={<MateriasPrimas />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/proveedores" element={<ProtectedRoute adminOnly><Proveedores /></ProtectedRoute>} />
        <Route path="/trabajadores" element={<Trabajadores />} />
        <Route path="/usuarios" element={<ProtectedRoute adminOnly><Usuarios /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

/**
 * Ensambla los providers transversales del frontend.
 *
 * El orden importa: el router debe envolver a las paginas, AuthProvider expone
 * el usuario actual y AppDataProvider consume ese estado para cargar datos.
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppDataProvider>
            <AppRoutes />
          </AppDataProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;