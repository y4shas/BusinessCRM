import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import { Loader2 } from 'lucide-react';

export default function ProtectedLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="page-loader" style={{ minHeight: '100vh' }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content fade-in">
        <Outlet />
      </div>
    </div>
  );
}
