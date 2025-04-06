
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import PreferenceSelection from "./components/onboarding/PreferenceSelection";

const queryClient = new QueryClient();

// Protected route component to handle auth redirection
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, profile } = useAuth();
  
  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center">
      <div className="h-8 w-8 border-4 border-scout-500 border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }
  
  // Not logged in - redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  // Logged in but hasn't completed onboarding - redirect to onboarding
  if (user && profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }
  
  // User is logged in and has completed onboarding
  return <>{children}</>;
};

// Wrapper component to provide AuthContext
const AppWithAuth = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

// Routes component to use auth context
const AppRoutes = () => {
  const { user, loading, profile } = useAuth();
  
  // Show loading indicator while auth state is being determined
  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center">
      <div className="h-8 w-8 border-4 border-scout-500 border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }
  
  return (
    <Routes>
      <Route 
        path="/" 
        element={
          user 
            ? profile?.onboarding_completed 
              ? <Index /> 
              : <Navigate to="/onboarding" replace />
            : <Auth />
        } 
      />
      <Route 
        path="/auth" 
        element={user ? <Navigate to="/" replace /> : <Auth />} 
      />
      <Route 
        path="/onboarding" 
        element={
          !user 
            ? <Navigate to="/auth" replace />
            : profile?.onboarding_completed
              ? <Navigate to="/" replace />
              : <Onboarding />
        } 
      />
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            {profile?.onboarding_completed ? <Profile /> : <Navigate to="/onboarding" replace />}
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/preferences" 
        element={
          !user
            ? <Navigate to="/auth" replace />
            : profile?.onboarding_completed
              ? <Navigate to="/" replace />
              : profile?.has_personality_insights
                ? <PreferenceSelection />
                : <Navigate to="/onboarding" replace />
        } 
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppWithAuth />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
