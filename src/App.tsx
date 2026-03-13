import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ParentAuthProvider, useParentAuth } from "@/contexts/ParentAuthContext";
import { DataProvider } from "@/contexts/DataContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import BabyDetail from "./pages/BabyDetail";
import RegisterBaby from "./pages/RegisterBaby";
import Alerts from "./pages/Alerts";
import AlertHistory from "./pages/AlertHistory";
import ParentLogin from "./pages/ParentLogin";
import ParentPortal from "./pages/ParentPortal";
import LiveMonitoring from "./pages/LiveMonitoring";
import NICUEnvironment from "./pages/NICUEnvironment";
import ShiftHandover from "./pages/ShiftHandover";
import FeedingStatusPage from "./pages/FeedingStatus";
import HealthRecords from "./pages/HealthRecords";
import CryDetectionPage from "./pages/CryDetectionPage";
import VoiceAssistant from "./pages/VoiceAssistant";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const ParentProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useParentAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/parent/login" replace />;
  }
  
  return <>{children}</>;
};

const ParentPublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useParentAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/parent/portal" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/baby/:id"
        element={
          <ProtectedRoute>
            <BabyDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/register"
        element={
          <ProtectedRoute>
            <RegisterBaby />
          </ProtectedRoute>
        }
      />
      <Route
        path="/alerts"
        element={
          <ProtectedRoute>
            <Alerts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <AlertHistory />
          </ProtectedRoute>
        }
      />
      {/* Parent Portal Routes - No authentication required */}
      <Route path="/parent" element={<Navigate to="/parent/portal" replace />} />
      <Route path="/parent/login" element={<Navigate to="/parent/portal" replace />} />
      <Route path="/parent/portal" element={<ParentPortal />} />
      {/* Live IoT Monitoring - Public access for demo/presentation */}
      <Route path="/live-monitoring" element={<LiveMonitoring />} />
      {/* New System-Level Pages */}
      <Route
        path="/cry-detection"
        element={
          <ProtectedRoute>
            <CryDetectionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nicu-environment"
        element={
          <ProtectedRoute>
            <NICUEnvironment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shift-handover"
        element={
          <ProtectedRoute>
            <ShiftHandover />
          </ProtectedRoute>
        }
      />
      <Route
        path="/feeding-status"
        element={
          <ProtectedRoute>
            <FeedingStatusPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/health-records"
        element={
          <ProtectedRoute>
            <HealthRecords />
          </ProtectedRoute>
        }
      />
      <Route
        path="/voice-assistant"
        element={
          <ProtectedRoute>
            <VoiceAssistant />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-chatbot"
        element={
          <ProtectedRoute>
            <AIChatbot />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ParentAuthProvider>
        <DataProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </DataProvider>
      </ParentAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
