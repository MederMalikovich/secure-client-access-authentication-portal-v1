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
import Doctors from "./pages/Doctors";
import Settings from "./pages/Settings";
import ClientPortal from "./pages/ClientPortal";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Training from "./pages/Training";
import ClientTraining from "./pages/ClientTraining";
import Prescriptions from "./pages/Prescriptions";
import Hospitalization from "./pages/Hospitalization";

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute staffOnly><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute staffOnly><MainLayout><Clients /></MainLayout></ProtectedRoute>} />
      <Route path="/pets" element={<ProtectedRoute><MainLayout><Pets /></MainLayout></ProtectedRoute>} />
      <Route path="/services" element={<ProtectedRoute staffOnly><MainLayout><Services /></MainLayout></ProtectedRoute>} />
      <Route path="/diseases" element={<ProtectedRoute staffOnly><MainLayout><Diseases /></MainLayout></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute requiredRoles={['admin', 'veterinarian', 'registrar', 'manager']}><MainLayout><Calendar /></MainLayout></ProtectedRoute>} />
      <Route path="/medical-records" element={<ProtectedRoute><MainLayout><MedicalRecords /></MainLayout></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute requiredRoles={['admin', 'veterinarian', 'manager']}><MainLayout><Inventory /></MainLayout></ProtectedRoute>} />
      <Route path="/shop" element={<ProtectedRoute staffOnly><MainLayout><Shop /></MainLayout></ProtectedRoute>} />
      <Route path="/finances" element={<ProtectedRoute requiredRoles={['admin', 'veterinarian', 'registrar', 'manager', 'accountant']}><MainLayout><Finances /></MainLayout></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute requiredRoles={['admin', 'manager', 'accountant']}><MainLayout><Reports /></MainLayout></ProtectedRoute>} />
      <Route path="/doctors" element={<ProtectedRoute requiredRoles={['admin', 'manager']}><MainLayout><Doctors /></MainLayout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute requiredRoles={['admin']}><MainLayout><Settings /></MainLayout></ProtectedRoute>} />
      <Route path="/my-cabinet" element={<ProtectedRoute requiredRoles={['client']}><MainLayout><ClientPortal /></MainLayout></ProtectedRoute>} />
      <Route path="/training" element={<ProtectedRoute staffOnly><MainLayout><Training /></MainLayout></ProtectedRoute>} />
      <Route path="/client-training" element={<ProtectedRoute requiredRoles={['client']}><MainLayout><ClientTraining /></MainLayout></ProtectedRoute>} />
      <Route path="/prescriptions" element={<ProtectedRoute><MainLayout><Prescriptions /></MainLayout></ProtectedRoute>} />
      <Route path="/hospitalization" element={<ProtectedRoute><MainLayout><Hospitalization /></MainLayout></ProtectedRoute>} />
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
