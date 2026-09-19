// src/routes/guards/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import YakuLoader from '@/components/layout/YakuLoader';

interface ProtectedRouteProps {
  allowedRole?: 'agricultor' | 'administrador';
  children?: React.ReactNode;
}

export default function ProtectedRoute({ allowedRole, children }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  // Mientras se verifica la sesion con el backend (/auth/perfil), si ya hay
  // un usuario en cache (localStorage) renderizamos la ruta de una vez en
  // lugar de esperar: esto deja que el fetch de datos de la pantalla corra
  // en paralelo con la verificacion, en vez de encadenados en serie. Si la
  // verificacion termina fallando, AuthContext limpia `user` y este mismo
  // componente redirige a login en el siguiente render.
  if (isLoading && !user) {
    return <YakuLoader fullScreen />;
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
