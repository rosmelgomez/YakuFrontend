// src/app/dashboard/agricultor/alertas/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import { authOptions } from '@/lib/auth';
import { Box } from '@radix-ui/themes';
import DashboardSkeleton from '@/components/layout/DashboardSkeleton';
import { getAlertasData, getNotifConfig } from '@/services/alertas';
import { getCultivosBase } from '@/services/cultivos-base';

import NoCropsEmptyState from '@/components/layout/NoCropsEmptyState';

export const dynamic = 'force-dynamic';

const AlertasClient = nextDynamic(() => import('@/components/agricultor/alertas/AlertasClient'), {
  loading: () => <DashboardSkeleton variant="form" />,
});

export default async function AlertasPage({ searchParams }: { searchParams: Promise<{ cultivo?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/auth/login');

  const userId = parseInt(session.user.id, 10);
  
  let cultivosBase = [];
  try {
    cultivosBase = await getCultivosBase();
  } catch {
    return <div style={{ color: 'white', padding: '2rem' }}>Error al conectar con el servidor backend.</div>;
  }
  
  if (cultivosBase.length === 0) {
    return <NoCropsEmptyState title="No tienes alertas activas" description="Para monitorear las alertas de humedad, temperatura y nivel de tanque, primero debes registrar tu cultivo." />;
  }

  const resolvedParams = await searchParams;
  const selectedCultivoId = resolvedParams.cultivo ? parseInt(resolvedParams.cultivo, 10) : cultivosBase[0].id;

  const alertasData = await getAlertasData(userId, selectedCultivoId);
  const notifConfig = await getNotifConfig();

  return (
    <Box className="page-content" style={{ padding: '2rem 0' }}>
      <Box style={{ width: '100%', maxWidth: '100%', paddingLeft: '16px', paddingRight: '16px' }}>
         <AlertasClient 
           userId={userId} 
           cultivos={cultivosBase} 
           initialData={alertasData} 
           initialCultivo={selectedCultivoId} 
           initialNotifConfig={notifConfig.configs} 
         />
      </Box>
    </Box>
  );
}
