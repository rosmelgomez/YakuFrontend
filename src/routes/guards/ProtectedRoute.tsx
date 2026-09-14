// src/routes/guards/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  allowedRole?: 'agricultor' | 'administrador';
  children?: React.ReactNode;
}

export default function ProtectedRoute({ allowedRole, children }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#020817] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <span className="text-sm text-slate-400">Cargando Yaku...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (allowedRole && user.rol !== allowedRole) {
    if (user.rol === 'administrador') {
      return <Navigate to="/dashboard/administrador" replace />;
    }
    return <Navigate to="/dashboard/agricultor" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
