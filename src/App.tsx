
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import AboutMe from "./pages/AboutMe";
import NotFound from "./pages/NotFound";
import PreferenceSelection from "./components/onboarding/PreferenceSelection";
import DiscoverPlaces from "./pages/DiscoverPlaces";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center">
      <div className="h-8 w-8 border-4 border-scout-500 border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

const AppWithAuth = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

const AppRoutes = () => {
  const { user, loading, profile } = useAuth();
  
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
            ? <Index /> 
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
            : <Onboarding />
        } 
      />
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/about-me" 
        element={
          <ProtectedRoute>
            <AboutMe />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/preferences" 
        element={
          <ProtectedRoute>
            <PreferenceSelection />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/discover" 
        element={
          <ProtectedRoute>
            <DiscoverPlaces />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppWithAuth />
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
