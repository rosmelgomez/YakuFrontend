// src/lib/prefetch.ts
import { getDashboardData } from '@/services/dashboard';
import { getCultivosBase } from '@/services/cultivos-base';

const prefetchedRoutes = new Set<string>();

export function prefetchRoute(route: string): void {
  if (prefetchedRoutes.has(route)) return;
  prefetchedRoutes.add(route);

  switch (route) {
    case '/dashboard/agricultor':
      import('@/screens/agricultor/DashboardScreen');
      getDashboardData().catch(() => {});
      break;
    case '/dashboard/agricultor/historico':
      import('@/screens/agricultor/HistoricoScreen');
      getCultivosBase().catch(() => {});
      break;
    case '/dashboard/agricultor/alertas':
      import('@/screens/agricultor/AlertasScreen');
      getCultivosBase().catch(() => {});
      break;
    case '/dashboard/agricultor/control':
      import('@/screens/agricultor/ControlScreen');
      getCultivosBase().catch(() => {});
      break;
    case '/dashboard/agricultor/ml':
      import('@/screens/agricultor/PredictivoScreen');
      getCultivosBase().catch(() => {});
      break;
    case '/dashboard/agricultor/feedback':
      import('@/screens/agricultor/FeedbackScreen');
      break;
    case '/dashboard/agricultor/perfil':
      import('@/screens/agricultor/PerfilScreen');
      break;
    case '/dashboard/agricultor/cultivos':
      import('@/screens/agricultor/CultivosScreen');
      break;
    case '/dashboard/agricultor/fuente-agua':
      import('@/screens/agricultor/FuenteAguaScreen');
      break;
    case '/dashboard/administrador':
      import('@/screens/administrador/AdminDashboardScreen');
      break;
    case '/dashboard/administrador/usuarios':
      import('@/screens/administrador/UsersScreen');
      break;
    case '/dashboard/administrador/dispositivos':
      import('@/screens/administrador/DevicesScreen');
      break;
    case '/dashboard/administrador/componentes':
      import('@/screens/administrador/ComponentsScreen');
      break;
    case '/dashboard/administrador/asignar-dispositivo':
      import('@/screens/administrador/AssignDeviceScreen');
      break;
    case '/dashboard/administrador/firmware':
      import('@/screens/administrador/FirmwareScreen');
      break;
    case '/dashboard/administrador/catalogo':
      import('@/screens/administrador/CatalogsScreen');
      break;
    case '/dashboard/administrador/feedback':
      import('@/screens/administrador/FeedbackQuestionsScreen');
      break;
    case '/dashboard/administrador/respaldo':
      import('@/screens/administrador/BackupScreen');
      break;
    case '/dashboard/agricultor/notificaciones':
      import('@/screens/common/NotificacionesHistoryScreen');
      break;
    case '/dashboard/administrador/perfil':
      import('@/screens/administrador/AdminPerfilScreen');
      break;
    case '/dashboard/administrador/almacenes':
      import('@/screens/administrador/WarehousesScreen');
      break;
    default:
      break;
  }
}
