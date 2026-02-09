import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Pages
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Pets from "./pages/Pets";
import Services from "./pages/Services";
import Diseases from "./pages/Diseases";
import Calendar from "./pages/Calendar";
import MedicalRecords from "./pages/MedicalRecords";
import Inventory from "./pages/Inventory";
import Shop from "./pages/Shop";
import Finances from "./pages/Finances";
import Reports from "./pages/Reports";
import Feedback from "./pages/Feedback";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/auth" element={<Auth />} />
      
      {/* Protected routes */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <MainLayout><Dashboard /></MainLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/clients" 
        element={
          <ProtectedRoute requiredRoles={['admin', 'veterinarian', 'registrar', 'manager', 'accountant', 'viewer']}>
            <MainLayout><Clients /></MainLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/pets" 
        element={
          <ProtectedRoute requiredRoles={['admin', 'veterinarian', 'registrar', 'manager', 'accountant', 'viewer']}>
            <MainLayout><Pets /></MainLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/services" 
        element={
          <ProtectedRoute requiredRoles={['admin', 'veterinarian', 'registrar', 'manager', 'accountant', 'viewer']}>
            <MainLayout><Services /></MainLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/diseases" 
        element={
          <ProtectedRoute requiredRoles={['admin', 'veterinarian', 'registrar', 'manager', 'accountant', 'viewer']}>
            <MainLayout><Diseases /></MainLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/calendar" 
        element={
          <ProtectedRoute requiredRoles={['admin', 'veterinarian', 'registrar', 'manager', 'accountant', 'viewer']}>
            <MainLayout><Calendar /></MainLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/medical-records" 
        element={
          <ProtectedRoute requiredRoles={['admin', 'veterinarian', 'registrar', 'manager']}>
            <MainLayout><MedicalRecords /></MainLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/inventory" 
        element={
          <ProtectedRoute requiredRoles={['admin', 'veterinarian', 'registrar', 'manager', 'accountant', 'viewer']}>
            <MainLayout><Inventory /></MainLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/shop" 
        element={
          <ProtectedRoute requiredRoles={['admin', 'manager', 'accountant', 'registrar']}>
            <MainLayout><Shop /></MainLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/finances" 
        element={
          <ProtectedRoute requiredRoles={['admin', 'manager', 'accountant']}>
            <MainLayout><Finances /></MainLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/reports" 
        element={
          <ProtectedRoute requiredRoles={['admin', 'manager', 'accountant']}>
            <MainLayout><Reports /></MainLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/feedback" 
        element={
          <ProtectedRoute requiredRoles={['admin', 'veterinarian', 'registrar', 'manager', 'accountant', 'viewer']}>
            <MainLayout><Feedback /></MainLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute requiredRoles={['admin', 'manager']}>
            <MainLayout><Settings /></MainLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
