import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Machines from "./pages/Machines";
import Energy from "./pages/Energy";
import Carbon from "./pages/Carbon";
import RealTime from "./pages/RealTime";
import Historical from "./pages/Historical";
import Anomalies from "./pages/Anomalies";
import Analytics from "./pages/Analytics";
import Optimization from "./pages/Optimization";
import Settings from "./pages/Settings";
import Meetings from "./pages/Meetings";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import { useEffect } from "react";
import NotFound from "./pages/NotFound";
import { useRealtimeData } from "./hooks/useRealtimeData";
import { useAppStore } from "./store/appStore";


const ThemeInitializer = () => {
  const isDarkMode = useAppStore((state) => state.isDarkMode);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return null;
};

const DataSync = () => {
  const { machines, anomalies, readings, loading } = useRealtimeData();
  const setMachines = useAppStore((state) => state.setMachines);
  const setAnomalies = useAppStore((state) => state.setAnomalies);
  const setReadings = useAppStore((state) => state.setReadings);

  useEffect(() => {
    if (!loading) {
      setMachines(machines);
    }
  }, [machines, loading, setMachines]);

  useEffect(() => {
    setAnomalies(anomalies);
  }, [anomalies, setAnomalies]);

  useEffect(() => {
    setReadings(readings);
  }, [readings, setReadings]);

  return null;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ThemeInitializer />
          <DataSync />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Protected routes */}
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/machines" element={<ProtectedRoute><Machines /></ProtectedRoute>} />
            <Route path="/energy" element={<ProtectedRoute><Energy /></ProtectedRoute>} />
            <Route path="/carbon" element={<ProtectedRoute><Carbon /></ProtectedRoute>} />
            <Route path="/realtime" element={<ProtectedRoute><RealTime /></ProtectedRoute>} />
            <Route path="/historical" element={<ProtectedRoute><Historical /></ProtectedRoute>} />
            <Route path="/anomalies" element={<ProtectedRoute><Anomalies /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/optimization" element={<ProtectedRoute><Optimization /></ProtectedRoute>} />
            <Route path="/meetings" element={<ProtectedRoute><Meetings /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
