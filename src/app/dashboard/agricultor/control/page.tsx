// src/app/dashboard/agricultor/control/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import { authOptions } from '@/lib/auth';
import { Box } from '@radix-ui/themes';
import DashboardSkeleton from '@/components/layout/DashboardSkeleton';
import { getControlData } from '@/services/control';
import { fetchFromFastAPI } from '@/lib/bff';
import { getCultivosBase } from '@/services/cultivos-base';
import type { CultivoBase } from '@/services/cultivos-base';

import NoCropsEmptyState from '@/components/layout/NoCropsEmptyState';

export const dynamic = 'force-dynamic';

const ControlClient = nextDynamic(() => import('@/components/agricultor/control/ControlClient'), {
  loading: () => <DashboardSkeleton variant="control" />,
});

export default async function ControlPage({ searchParams }: { searchParams: Promise<{ cultivo?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/auth/login');

  const userId = parseInt(session.user.id, 10);
  
  let cultivosBase: CultivoBase[] = [];
  try {
    cultivosBase = await getCultivosBase();
  } catch {
    return <div style={{ color: 'white', padding: '2rem' }}>Error al conectar con el servidor backend.</div>;
  }
  
  if (cultivosBase.length === 0) {
    return <NoCropsEmptyState title="No tienes control de riego activo" description="Para administrar los modos de riego (manual, programado o inteligente por IA) y conmutar tus bombas de agua, primero debes registrar tu cultivo." />;
  }

  const resolvedParams = await searchParams;
  const requestedCultivoId = resolvedParams.cultivo
    ? Number.parseInt(resolvedParams.cultivo, 10)
    : undefined;
  const selectedCultivoId = cultivosBase.some(({ id }) => id === requestedCultivoId)
    ? requestedCultivoId!
    : cultivosBase[0].id;

  let controlData;
  try {
    controlData = await getControlData(userId, selectedCultivoId);
  } catch {
    return (
      <div style={{ color: 'white', padding: '2rem' }}>
        No se pudieron cargar los datos de control. Intenta nuevamente en unos momentos.
      </div>
    );
  }
  
  let modelosML = [];
  try {
    const resModels = await fetchFromFastAPI(`/ml/models?id_cultivo=${selectedCultivoId}`);
    if (resModels.ok) {
      modelosML = await resModels.json();
    }
  } catch {}

  return (
    <Box className="page-content" style={{ padding: '2rem 0' }}>
      <Box style={{ width: '100%', maxWidth: '100%', paddingLeft: '16px', paddingRight: '16px' }}>
         <ControlClient userId={userId} cultivos={cultivosBase} data={controlData} idCultivo={selectedCultivoId} modelosML={modelosML} />
      </Box>
    </Box>
  );
}
