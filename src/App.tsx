import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/auth';
import { useProductsStore } from './store/products';
import { useSalesStore } from './store/sales';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { supabase } from './lib/supabase';
import toast from 'react-hot-toast';

function App() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { setIsOnline, syncPendingOperations } = useProductsStore();
  const { setIsOnline: setSalesIsOnline, syncPendingSales } = useSalesStore();
  const [isOnline, setIsOnlineState] = useState(navigator.onLine);

  useEffect(() => {
    
    const handleOnline = async () => {
      setIsOnlineState(true);
      setIsOnline(true);
      setSalesIsOnline(true);
      toast.success('Conexión restaurada');
      
      try {
        // Sincronizar datos pendientes
        await syncPendingOperations();
        await syncPendingSales();
        toast.success('Datos sincronizados correctamente');
      } catch (error) {
        console.error('Error al sincronizar:', error);
        toast.error('Error al sincronizar los datos');
      }
    };

    const handleOffline = () => {
      setIsOnlineState(false);
      setIsOnline(false);
      setSalesIsOnline(false);
      toast.error('Sin conexión - Modo offline activado');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    supabase.auth.onAuthStateChange((event, session) => {
      useAuthStore.setState({ 
        isAuthenticated: !!session,
        isLoading: false
      });
    });

    // Solicitar permiso para notificaciones
    if ('Notification' in window) {
      Notification.requestPermission();
    }

    // Intentar sincronizar al cargar la aplicación si hay conexión
    if (navigator.onLine) {
      syncPendingOperations();
      syncPendingSales();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/" /> : <Login />} 
        />
        <Route 
          path="/*" 
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
        />
      </Routes>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

export default App;