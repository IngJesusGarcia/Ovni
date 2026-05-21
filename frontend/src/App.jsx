import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import LowStock from './pages/LowStock';
import Pricing from './pages/Pricing';
import CashRegister from './pages/CashRegister';
import Clients from './pages/Clients';
import Reports from './pages/Reports';

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/' : '/pos'} /> : <Login />} />
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/" element={<ProtectedRoute roles={['admin']}><Dashboard /></ProtectedRoute>} />
        <Route path="/pos" element={<POS />} />
        <Route path="/products" element={<Products />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/low-stock" element={<LowStock />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/cash-register" element={<CashRegister />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/reports" element={<ProtectedRoute roles={['admin']}><Reports /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
