// src/app/dashboard/agricultor/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import { authOptions } from '@/lib/auth';
import { Box, Heading, Text, Flex } from '@radix-ui/themes';
import { getDashboardData } from '@/services/dashboard';
import DashboardSkeleton from '@/components/layout/DashboardSkeleton';
import {
  listarPlantas,
  listarFuentesAgua,
  listarRegiones,
  listarTodasProvincias,
  listarTodosDistritos,
} from '@/actions/crops';

export const dynamic = 'force-dynamic';

const DashboardClient = nextDynamic(() => import('@/components/agricultor/dashboard/DashboardClient'), {
  loading: () => <DashboardSkeleton variant="dashboard" />,
});

export const metadata = {
  title: 'Dashboard - Yaku',
  description: 'Panel de control de monitoreo y riego automático',
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/auth/login');
  }

  const userId = parseInt(session.user.id, 10);
  
  // Cargar todos los datos en paralelo para acelerar la transición de página
  const [
    cultivosData,
    catalogPlantas,
    fuentesAgua,
    regiones,
    provincias,
    distritos
  ] = await Promise.all([
    getDashboardData(userId),
    listarPlantas().catch(() => []),
    listarFuentesAgua().catch(() => []),
    listarRegiones().catch(() => []),
    listarTodasProvincias().catch(() => []),
    listarTodosDistritos().catch(() => [])
  ]);

  // Iniciales para el perfil
  const name = session?.user?.name || "JR";
  const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <Box className="page-content" style={{ padding: '2rem 0' }}>
      <Box style={{ width: '100%', maxWidth: '100%', paddingLeft: '16px', paddingRight: '16px' }}>
        
        <Box mb="6" px="4">
          <Flex align="center" gap="3" mb="2">
            <div style={{ 
              width: '40px', 
              height: '40px', 
              background: 'white',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem'
            }}>
              🌊
            </div>
            <Heading size="8" style={{ color: 'white' }}>
              ¡Hola, {session.user.name || 'Agricultor'}!
            </Heading>
          </Flex>
          <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Aquí tienes el resumen en tiempo real de las condiciones de tus cultivos.
          </Text>
        </Box>

        <Box px="4">
           <DashboardClient 
             cultivos={cultivosData as any} 
             catalogPlantas={catalogPlantas}
             fuentesAgua={fuentesAgua}
             regiones={regiones}
             provincias={provincias}
             distritos={distritos}
           />
        </Box>
        
      </Box>
    </Box>
  );
}
