import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { ThemeProvider } from "@/contexts/ThemeContext";

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

import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
      <Route path="/clients" element={<MainLayout><Clients /></MainLayout>} />
      <Route path="/pets" element={<MainLayout><Pets /></MainLayout>} />
      <Route path="/services" element={<MainLayout><Services /></MainLayout>} />
      <Route path="/diseases" element={<MainLayout><Diseases /></MainLayout>} />
      <Route path="/calendar" element={<MainLayout><Calendar /></MainLayout>} />
      <Route path="/medical-records" element={<MainLayout><MedicalRecords /></MainLayout>} />
      <Route path="/inventory" element={<MainLayout><Inventory /></MainLayout>} />
      <Route path="/shop" element={<MainLayout><Shop /></MainLayout>} />
      <Route path="/finances" element={<MainLayout><Finances /></MainLayout>} />
      <Route path="/reports" element={<MainLayout><Reports /></MainLayout>} />
      <Route path="/feedback" element={<MainLayout><Feedback /></MainLayout>} />
      <Route path="/settings" element={<MainLayout><Settings /></MainLayout>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
