// src/app/dashboard/administrador/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import { authOptions } from '@/lib/auth';
import { Box, Text, Card } from '@radix-ui/themes';
import DashboardSkeleton from '@/components/layout/DashboardSkeleton';
import { obtenerResumenAdmin } from '@/actions/admin';

export const metadata = {
  title: 'Dashboard de Administración - Yaku',
  description: 'Estadísticas globales, auditoría y análisis de Machine Learning de la red Yaku',
};

export const dynamic = 'force-dynamic';

const AdminDashboardClient = nextDynamic(() => import('@/components/administrador/dashboard/AdminDashboardClient'), {
  loading: () => <DashboardSkeleton variant="admin" />,
});

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  // 1. Proteger ruta a nivel de servidor (Redundancia segura al Middleware/Proxy)
  if (!session?.user?.id) {
    redirect('/auth/login');
  }

  const userRol = (session.user as any).rol;
  if (userRol !== 'administrador') {
    redirect('/dashboard/agricultor');
  }

  // 2. Cargar datos del resumen administrativo desde FastAPI
  const summary = await obtenerResumenAdmin().catch(() => {
    return null;
  });

  if (!summary) {
    return (
      <Box
        className="page-content"
        px={{ initial: "4", sm: "5", md: "6" }}
        py={{ initial: "4", sm: "5", md: "6" }}
      >
        <Card size="3" style={{ background: '#111827', borderColor: '#ef4444' }}>
          <Text color="red" weight="bold" size="3">
            Error al conectar con el backend de FastAPI. Asegúrese de que el servidor esté activo.
          </Text>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      className="page-content"
      px={{ initial: "4", sm: "5", md: "6" }}
      py={{ initial: "4", sm: "5", md: "6" }}
    >
      <AdminDashboardClient data={summary} />
    </Box>
  );
}
