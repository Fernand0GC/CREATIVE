// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginScreen from "@/components/LoginScreen";
import DashboardLayout from "@/components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Payments from "./pages/Payments";
import Journal from "./pages/Journal";
import Reports from "./pages/Reports";
import Services from "./pages/Services";
import Users from "./pages/Users";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Loader simple reutilizable
const LoadingScreen = ({ label = "Cargando..." }: { label?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
    <div className="text-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-muted-foreground">{label}</p>
    </div>
  </div>
);

// Protected Route: requiere sesión
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen label="Verificando sesión..." />;

  return user ? <DashboardLayout>{children}</DashboardLayout> : <LoginScreen />;
};

// Admin Route: requiere rol admin
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  console.log("AdminRoute user:", user);
  if (loading) return <LoadingScreen label="Verificando permisos..." />;

  // Compatibilidad: usa user.role === 'admin' (nuevo) o user.isAdmin (anterior)
  const isAdmin =
    (user as any)?.role === "admin" || (user as any)?.isAdmin === true;

  if (!isAdmin) return <Navigate to="/orders" replace />;

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Inicio: si hay sesión, cae en Dashboard (solo admin); si no, Login via ProtectedRoute */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <Dashboard />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />

            {/* Órdenes: accesible para admin y empleado */}
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              }
            />

            {/* Rutas SOLO admin */}
            <Route
              path="/payments"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <Payments />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/journal"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <Journal />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <Reports />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/services"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <Services />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <Users />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
