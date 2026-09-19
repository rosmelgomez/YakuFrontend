// src/routes/AppRoutes.tsx
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

import RootLayout from '@/layouts/RootLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import ProtectedRoute from '@/routes/guards/ProtectedRoute';
import YakuLoader from '@/components/layout/YakuLoader';

// Pantallas de auth: import estatico (no lazy). Son la primera pantalla que
// ve casi cualquier visitante nuevo, asi que separarlas en su propio chunk
// solo agrega un round-trip extra sin beneficio (a diferencia del dashboard,
// al que se llega despues de cargar la app y que si conviene diferir).
import LoginScreen from '@/screens/auth/LoginScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import VerifyEmailScreen from '@/screens/auth/VerifyEmailScreen';
import ResetPasswordScreen from '@/screens/auth/ResetPasswordScreen';

// Lazy-loaded Agricultor Screens
const DashboardScreen = lazy(() => import('@/screens/agricultor/DashboardScreen'));
const ControlScreen = lazy(() => import('@/screens/agricultor/ControlScreen'));
const HistoricoScreen = lazy(() => import('@/screens/agricultor/HistoricoScreen'));
const AlertasScreen = lazy(() => import('@/screens/agricultor/AlertasScreen'));
const PredictivoScreen = lazy(() => import('@/screens/agricultor/PredictivoScreen'));
const FeedbackScreen = lazy(() => import('@/screens/agricultor/FeedbackScreen'));
const PerfilScreen = lazy(() => import('@/screens/agricultor/PerfilScreen'));
const CultivosScreen = lazy(() => import('@/screens/agricultor/CultivosScreen'));
const FuenteAguaScreen = lazy(() => import('@/screens/agricultor/FuenteAguaScreen'));

// Lazy-loaded Administrador Screens
const AdminDashboardScreen = lazy(() => import('@/screens/administrador/AdminDashboardScreen'));
const UsersScreen = lazy(() => import('@/screens/administrador/UsersScreen'));
const DevicesScreen = lazy(() => import('@/screens/administrador/DevicesScreen'));
const ComponentsScreen = lazy(() => import('@/screens/administrador/ComponentsScreen'));
const AssignDeviceScreen = lazy(() => import('@/screens/administrador/AssignDeviceScreen'));
const FirmwareScreen = lazy(() => import('@/screens/administrador/FirmwareScreen'));
const CatalogsScreen = lazy(() => import('@/screens/administrador/CatalogsScreen'));
const FeedbackQuestionsScreen = lazy(() => import('@/screens/administrador/FeedbackQuestionsScreen'));
const WarehousesScreen = lazy(() => import('@/screens/administrador/WarehousesScreen'));
const BackupScreen = lazy(() => import('@/screens/administrador/BackupScreen'));
const AdminPerfilScreen = lazy(() => import('@/screens/administrador/AdminPerfilScreen'));
const MqttConfigScreen = lazy(() => import('@/screens/administrador/MqttConfigScreen'));
const MaintenanceHistoryScreen = lazy(() => import('@/screens/administrador/MaintenanceHistoryScreen'));
const NotificacionesHistoryScreen = lazy(() => import('@/screens/common/NotificacionesHistoryScreen'));

function SuspenseWrapper({ children }: { children: React.ReactNode; variant?: 'dashboard' | 'chart' | 'control' | 'admin' | 'form' }) {
  return (
    <Suspense fallback={<YakuLoader />}>
      {children}
    </Suspense>
  );
}

function RootIndexRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Ver nota en ProtectedRoute.tsx: con usuario en cache no hace falta
  // esperar la verificacion para decidir a que dashboard ir.
  if (isLoading && !user) {
    return <YakuLoader message="Iniciando Yaku..." fullScreen />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (user.rol === 'administrador') {
    return <Navigate to="/dashboard/administrador" replace />;
  }

  return <Navigate to="/dashboard/agricultor" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        {/* Raíz */}
        <Route path="/" element={<RootIndexRedirect />} />

        {/* Autenticación: import estatico, no necesitan Suspense */}
        <Route path="/auth/login" element={<LoginScreen />} />
        <Route path="/auth/register" element={<RegisterScreen />} />
        <Route path="/auth/verificar-correo" element={<VerifyEmailScreen />} />
        <Route path="/auth/recuperar-contrasena" element={<ResetPasswordScreen />} />

        {/* Panel Privado */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<RootIndexRedirect />} />

          {/* Rutas de Agricultor */}
          <Route
            path="agricultor"
            element={
              <ProtectedRoute allowedRole="agricultor">
                <SuspenseWrapper variant="dashboard"><DashboardScreen /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="agricultor/historico"
            element={
              <ProtectedRoute allowedRole="agricultor">
                <SuspenseWrapper variant="chart"><HistoricoScreen /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="agricultor/alertas"
            element={
              <ProtectedRoute allowedRole="agricultor">
                <SuspenseWrapper variant="form"><NotificacionesHistoryScreen /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="agricultor/notificaciones"
            element={
              <ProtectedRoute allowedRole="agricultor">
                <SuspenseWrapper variant="form"><NotificacionesHistoryScreen /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="agricultor/control"
            element={
              <ProtectedRoute allowedRole="agricultor">
                <SuspenseWrapper variant="control"><ControlScreen /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="agricultor/ml"
            element={
              <ProtectedRoute allowedRole="agricultor">
                <SuspenseWrapper variant="chart"><PredictivoScreen /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="agricultor/feedback"
            element={
              <ProtectedRoute allowedRole="agricultor">
                <SuspenseWrapper variant="form"><FeedbackScreen /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="agricultor/perfil"
            element={
              <ProtectedRoute>
                <SuspenseWrapper variant="form"><PerfilScreen /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="agricultor/cultivos"
            element={
              <ProtectedRoute allowedRole="agricultor">
                <SuspenseWrapper variant="dashboard"><CultivosScreen /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="agricultor/fuente-agua"
            element={
              <ProtectedRoute allowedRole="agricultor">
                <SuspenseWrapper variant="dashboard"><FuenteAguaScreen /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="agricultor/registro"
            element={<Navigate to="/dashboard/agricultor/cultivos" replace />}
          />
          <Route
            path="agricultor/sensores"
            element={<Navigate to="/dashboard/agricultor" replace />}
          />
          <Route
            path="agricultor/riego"
            element={<Navigate to="/dashboard/agricultor/control" replace />}
          />

          {/* Rutas de Administrador */}
          <Route
            path="administrador"
            element={
              <ProtectedRoute allowedRole="administrador">
                <SuspenseWrapper variant="admin"><AdminDashboardScreen /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="administrador/usuarios"
            element={
              <ProtectedRoute allowedRole="administrador">
                <SuspenseWrapper variant="admin"><UsersScreen /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="administrador/dispositivos"
            element={
              <ProtectedRoute allowedRole="administrador">
                <SuspenseWrapper variant="admin"><DevicesScreen /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="administrador/componentes"
            element={
              <ProtectedRoute allowedRole="administrador">
                <SuspenseWrapper variant="admin"><ComponentsScreen /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="administrador/asignar-dispositivo"
            element={
              <ProtectedRoute allowedRole="administrador">
                <SuspenseWrapper variant="admin"><AssignDeviceScreen /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="administrador/firmware"
            element={
              <ProtectedRoute allowedRole="administrador">
                <SuspenseWrapper variant="admin"><FirmwareScreen /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="administrador/catalogo"
            element={
              <ProtectedRoute allowedRole="administrador">
                <SuspenseWrapper variant="admin"><CatalogsScreen /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="administrador/feedback"
            element={
              <ProtectedRoute allowedRole="administrador">
                <SuspenseWrapper variant="admin"><FeedbackQuestionsScreen /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="administrador/respaldo"
            element={
              <ProtectedRoute allowedRole="administrador">
                <SuspenseWrapper variant="admin"><BackupScreen /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="administrador/almacenes"
            element={
              <ProtectedRoute allowedRole="administrador">
                <SuspenseWrapper variant="admin"><WarehousesScreen /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="administrador/mqtt-config"
            element={
              <ProtectedRoute allowedRole="administrador">
                <SuspenseWrapper variant="admin"><MqttConfigScreen /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="administrador/mantenimiento"
            element={
              <ProtectedRoute allowedRole="administrador">
                <SuspenseWrapper variant="admin"><MaintenanceHistoryScreen /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="administrador/perfil"
            element={
              <ProtectedRoute allowedRole="administrador">
                <SuspenseWrapper variant="form"><AdminPerfilScreen /></SuspenseWrapper>
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Ruta no encontrada */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
