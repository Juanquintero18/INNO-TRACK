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
import type { AppModule } from "@/contexts/AuthContext";
import { AppDataProvider } from "@/contexts/AppDataContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Proyectos from "./pages/Proyectos";
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
 * Envuelve rutas privadas y aplica validaciones de sesion y acceso por modulo.
 */
function ProtectedRoute({
  children,
  module,
}: {
  children: React.ReactNode;
  module?: AppModule;
}) {
  const { user, isLoading, canAccessModule } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/" replace />;
  if (module && !canAccessModule(module)) return <Navigate to="/dashboard" replace />;
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
        <Route path="/dashboard" element={<ProtectedRoute module="dashboard"><Dashboard /></ProtectedRoute>} />
        <Route path="/proyectos" element={<ProtectedRoute module="proyectos"><Proyectos /></ProtectedRoute>} />
        <Route path="/piezas" element={<ProtectedRoute module="piezas"><Piezas /></ProtectedRoute>} />
        <Route path="/auditoria" element={<ProtectedRoute module="auditoria"><Auditoria /></ProtectedRoute>} />
        <Route path="/materias-primas" element={<ProtectedRoute module="materias-primas"><MateriasPrimas /></ProtectedRoute>} />
        <Route path="/inventario" element={<ProtectedRoute module="inventario"><Inventario /></ProtectedRoute>} />
        <Route path="/proveedores" element={<ProtectedRoute module="proveedores"><Proveedores /></ProtectedRoute>} />
        <Route path="/trabajadores" element={<ProtectedRoute module="trabajadores"><Trabajadores /></ProtectedRoute>} />
        <Route path="/usuarios" element={<ProtectedRoute module="usuarios"><Usuarios /></ProtectedRoute>} />
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