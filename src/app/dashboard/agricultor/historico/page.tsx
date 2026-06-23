// src/app/dashboard/agricultor/historico/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import { authOptions } from '@/lib/auth';
import { Box, Text } from '@radix-ui/themes';
import DashboardSkeleton from '@/components/layout/DashboardSkeleton';
import { getHistoricoData } from '@/services/historico';
import { getCultivosBase } from '@/services/cultivos-base';

export const metadata = {
  title: 'Análisis Histórico - Yaku',
  description: 'Visualización de telemetría a largo plazo',
};

export const dynamic = 'force-dynamic';

const HistoricoMultiChart = nextDynamic(() => import('@/components/agricultor/historico/HistoricoMultiChart'), {
  loading: () => <DashboardSkeleton variant="chart" />,
});

import NoCropsEmptyState from '@/components/layout/NoCropsEmptyState';

export default async function HistoricoPage({
  searchParams
}: {
  searchParams: Promise<{ cultivo?: string, rango?: string }>
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/auth/login');
  }

  const userId = parseInt(session.user.id, 10);

  let cultivosBase = [];
  try {
    cultivosBase = await getCultivosBase();
  } catch {
    return <Text color="red" style={{ padding: '2rem' }}>Error al conectar con el servidor backend.</Text>;
  }

  if (cultivosBase.length === 0) {
    return <NoCropsEmptyState title="No tienes historial de telemetría" description="Para visualizar los gráficos históricos de humedad de suelo, humedad ambiente y temperatura, primero debes registrar tu cultivo." />;
  }

  const resolvedSearchParams = await searchParams;
  const selectedCultivoId = resolvedSearchParams.cultivo ? parseInt(resolvedSearchParams.cultivo, 10) : cultivosBase[0].id;
  const rangoDias = resolvedSearchParams.rango ? parseInt(resolvedSearchParams.rango, 10) : 30;

  const historicoData = await getHistoricoData(userId, selectedCultivoId, rangoDias);

  return (
    <Box className="page-content" style={{ padding: '2rem 0' }}>
      <Box style={{ width: '100%', maxWidth: '100%', paddingLeft: '16px', paddingRight: '16px' }}>
        <HistoricoMultiChart
          cultivos={cultivosBase}
          initialData={historicoData}
          initialCultivo={selectedCultivoId.toString()}
          initialRango={rangoDias}
        />
      </Box>
    </Box>
  );
}
