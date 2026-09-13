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

export default async function HistoricoPage() {
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

  const selectedCultivoId = cultivosBase[0].id;
  const rangoDias = 7;

  const historicoData = await getHistoricoData(userId, selectedCultivoId, rangoDias);

  return (
    <Box
      className="page-content"
      px={{ initial: "4", sm: "5", md: "6" }}
      py={{ initial: "4", sm: "5", md: "6" }}
    >
      <HistoricoMultiChart
        userId={userId}
        cultivos={cultivosBase}
        initialData={historicoData}
        initialCultivo={selectedCultivoId.toString()}
        initialRango={rangoDias}
      />
    </Box>
  );
}
