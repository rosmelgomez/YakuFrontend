// src/app/dashboard/agricultor/control/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import { authOptions } from '@/lib/auth';
import { Box } from '@radix-ui/themes';
import DashboardSkeleton from '@/components/layout/DashboardSkeleton';
import { getControlData } from '@/services/control';
import { getAlertasData } from '@/services/alertas';
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
    return <NoCropsEmptyState title="No tienes control de riego activo" description="Para administrar el riego inteligente por IA y supervisar tus bombas y actuadores, primero debes registrar tu cultivo." />;
  }

  const selectedCultivoId = cultivosBase[0].id;

  let controlData;
  let modelosML = [];
  let initialUmbrales = [];
  try {
    const [cData, mlRes, alertasRes] = await Promise.all([
      getControlData(userId, selectedCultivoId),
      listarModelosML(selectedCultivoId).catch(() => ({ success: false, data: [] })),
      getAlertasData(userId, selectedCultivoId).catch(() => ({ umbrales: [] })),
    ]);
    controlData = cData;
    if (mlRes.success && mlRes.data) {
      modelosML = mlRes.data;
    }
    if (alertasRes?.umbrales) {
      initialUmbrales = alertasRes.umbrales;
    }
  } catch {
    return (
      <div style={{ color: 'white', padding: '2rem' }}>
        No se pudieron cargar los datos de control. Intenta nuevamente en unos momentos.
      </div>
    );
  }
  
  return (
    <Box
      className="page-content"
      px={{ initial: "4", sm: "5", md: "6" }}
      py={{ initial: "4", sm: "5", md: "6" }}
    >
      <ControlClient 
        userId={userId} 
        cultivos={cultivosBase} 
        data={controlData} 
        idCultivo={selectedCultivoId} 
        modelosML={modelosML} 
        initialUmbrales={initialUmbrales}
      />
    </Box>
  );
}
