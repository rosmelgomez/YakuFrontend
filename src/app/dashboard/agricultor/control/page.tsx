// src/app/dashboard/agricultor/control/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import { authOptions } from '@/lib/auth';
import { Box } from '@radix-ui/themes';
import DashboardSkeleton from '@/components/layout/DashboardSkeleton';
import { getControlData } from '@/services/control';
import { getCultivosBase } from '@/services/cultivos-base';
import type { CultivoBase } from '@/services/cultivos-base';
import { listarModelosML } from '@/actions/ml';

import NoCropsEmptyState from '@/components/layout/NoCropsEmptyState';

export const dynamic = 'force-dynamic';

const ControlClient = nextDynamic(() => import('@/components/agricultor/control/ControlClient'), {
  loading: () => <DashboardSkeleton variant="control" />,
});

export default async function ControlPage() {
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

  const selectedCultivoId = cultivosBase[0].id;

  let controlData;
  let modelosML = [];
  try {
    const [cData, mlRes] = await Promise.all([
      getControlData(userId, selectedCultivoId),
      listarModelosML(selectedCultivoId).catch(() => ({ success: false, data: [] }))
    ]);
    controlData = cData;
    if (mlRes.success && mlRes.data) {
      modelosML = mlRes.data;
    }
  } catch {
    return (
      <div style={{ color: 'white', padding: '2rem' }}>
        No se pudieron cargar los datos de control. Intenta nuevamente en unos momentos.
      </div>
    );
  }
  
  return (
    <Box className="page-content" style={{ padding: '2rem 0' }}>
      <Box style={{ width: '100%', maxWidth: '100%', paddingLeft: '16px', paddingRight: '16px' }}>
         <ControlClient 
           userId={userId} 
           cultivos={cultivosBase} 
           data={controlData} 
           idCultivo={selectedCultivoId} 
           modelosML={modelosML} 
           initialUmbrales={[]}
         />
      </Box>
    </Box>
  );
}
