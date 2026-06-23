// src/app/dashboard/agricultor/ml/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import { authOptions } from '@/lib/auth';
import { Box, Text } from '@radix-ui/themes';
import DashboardSkeleton from '@/components/layout/DashboardSkeleton';
import { getMLDashboardData } from '@/services/ml';
import { getCultivosBase } from '@/services/cultivos-base';

import NoCropsEmptyState from '@/components/layout/NoCropsEmptyState';

export const dynamic = 'force-dynamic';

const MLClient = nextDynamic(() => import('@/components/agricultor/ml/MLClient'), {
  loading: () => <DashboardSkeleton variant="chart" />,
});

export default async function MLPage({ searchParams }: { searchParams: Promise<{ cultivo?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/auth/login');

  const userId = parseInt(session.user.id, 10);
  
  let cultivosBase = [];
  try {
    cultivosBase = await getCultivosBase();
  } catch {
    return <Text color="red" style={{ padding: '2rem' }}>Error al conectar con el servidor backend.</Text>;
  }
  
  if (cultivosBase.length === 0) {
    return <NoCropsEmptyState title="No tienes predicciones de IA activas" description="Para consultar las recomendaciones automáticas de riego inteligente generadas por el modelo de Machine Learning, primero debes registrar tu cultivo." />;
  }

  const resolvedParams = await searchParams;
  const selectedCultivoId = resolvedParams.cultivo ? parseInt(resolvedParams.cultivo, 10) : cultivosBase[0].id;

  const mlData = await getMLDashboardData(userId, selectedCultivoId);
  const isAdmin = (session.user as any).rol === 'administrador';

  return (
    <Box className="page-content" style={{ padding: '2rem 0' }}>
      <Box style={{ width: '100%', maxWidth: '100%', paddingLeft: '16px', paddingRight: '16px' }}>
         <MLClient data={mlData} cultivos={cultivosBase} idCultivo={selectedCultivoId} isAdmin={isAdmin} />
      </Box>
    </Box>
  );
}
