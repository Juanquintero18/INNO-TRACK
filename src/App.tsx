// src/App.tsx

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

//Componente para proteger rutas que requieren autenticación y, opcionalmente, permisos de administrador

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}


//Define las rutas de la aplicación, protegiendo las que requieren autenticación y permisos de administrador

function AppRoutes() {
  const { user } = useAuth();

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

//Componente principal de la aplicación que envuelve todo en los proveedores necesarios para el manejo de estado, autenticación y enrutamiento


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

//Exporta el componente principal de la aplicación

export default App;


//backend: