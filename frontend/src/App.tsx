import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useTheme } from './hooks/useTheme';
import ProtectedLayout from './components/ProtectedLayout';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import CustomersPage from './pages/Customers';
import ProductsPage from './pages/Products';
import ChallansPage from './pages/Challans';
import UsersPage from './pages/Users';
import './index.css';

/** Apply saved theme on first render */
function ThemeInitializer() {
  useTheme(); // applies data-theme to <html> from localStorage
  return null;
}

/** Redirect each role to their natural landing page */
function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  switch (user.role) {
    case 'ADMIN':      return <Navigate to="/dashboard" replace />;
    case 'SALES':      return <Navigate to="/customers" replace />;
    case 'WAREHOUSE':  return <Navigate to="/products" replace />;
    case 'ACCOUNTS':   return <Navigate to="/challans" replace />;
    default:           return <Navigate to="/challans" replace />;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ThemeInitializer />
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected */}
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<RoleRedirect />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/challans" element={<ChallansPage />} />
              <Route path="/users" element={<UsersPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1d2e',
              color: '#e8eaf0',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              fontSize: 13.5,
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
