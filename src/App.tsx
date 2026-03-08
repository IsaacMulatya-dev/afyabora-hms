import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Patients from "@/pages/Patients";
import PatientRegistration from "@/pages/PatientRegistration";
import Consultations from "@/pages/Consultations";
import NewConsultation from "@/pages/NewConsultation";
import ConsultationDetail from "@/pages/ConsultationDetail";
import Laboratory from "@/pages/Laboratory";
import NewLabTest from "@/pages/NewLabTest";
import LabTestDetail from "@/pages/LabTestDetail";
import Pharmacy from "@/pages/Pharmacy";
import PrescriptionDetail from "@/pages/PrescriptionDetail";
import PlaceholderPage from "@/components/PlaceholderPage";
import Reports from "@/pages/Reports";
import SettingsPage from "@/pages/Settings";
import Billing from "@/pages/Billing";
import NewInvoice from "@/pages/NewInvoice";
import BillingDetail from "@/pages/BillingDetail";
import Inpatient from "@/pages/Inpatient";
import NewAdmission from "@/pages/NewAdmission";
import InpatientDetail from "@/pages/InpatientDetail";
import Auth from "@/pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<Auth />} />
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <AppLayout>
            <Dashboard />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/patients"
      element={
        <ProtectedRoute>
          <AppLayout>
            <Patients />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/patients/register"
      element={
        <ProtectedRoute>
          <AppLayout>
            <PatientRegistration />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/consultations"
      element={
        <ProtectedRoute>
          <AppLayout>
            <Consultations />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/consultations/new"
      element={
        <ProtectedRoute>
          <AppLayout>
            <NewConsultation />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/consultations/:id"
      element={
        <ProtectedRoute>
          <AppLayout>
            <ConsultationDetail />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/laboratory"
      element={
        <ProtectedRoute>
          <AppLayout>
            <Laboratory />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/laboratory/new"
      element={
        <ProtectedRoute>
          <AppLayout>
            <NewLabTest />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/laboratory/:id"
      element={
        <ProtectedRoute>
          <AppLayout>
            <LabTestDetail />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/pharmacy"
      element={
        <ProtectedRoute>
          <AppLayout>
            <Pharmacy />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/pharmacy/:id"
      element={
        <ProtectedRoute>
          <AppLayout>
            <PrescriptionDetail />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/billing"
      element={
        <ProtectedRoute>
          <AppLayout>
            <Billing />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/billing/new"
      element={
        <ProtectedRoute>
          <AppLayout>
            <NewInvoice />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/billing/:id"
      element={
        <ProtectedRoute>
          <AppLayout>
            <BillingDetail />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/inpatient"
      element={
        <ProtectedRoute>
          <AppLayout>
            <Inpatient />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/inpatient/admit"
      element={
        <ProtectedRoute>
          <AppLayout>
            <NewAdmission />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/inpatient/:id"
      element={
        <ProtectedRoute>
          <AppLayout>
            <InpatientDetail />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/reports"
      element={
        <ProtectedRoute>
          <AppLayout>
            <Reports />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings"
      element={
        <ProtectedRoute>
          <AppLayout>
            <SettingsPage />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
