// src/app/dashboard/agricultor/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import { authOptions } from '@/lib/auth';
import { Box, Heading, Text, Flex } from '@radix-ui/themes';
import { getDashboardData } from '@/services/dashboard';
import DashboardSkeleton from '@/components/layout/DashboardSkeleton';

export const dynamic = 'force-dynamic';

const DashboardClient = nextDynamic(() => import('@/components/agricultor/dashboard/DashboardClient'), {
  loading: () => <DashboardSkeleton variant="dashboard" />,
});

export const metadata = {
  title: 'Dashboard - Yaku',
  description: 'Panel de control de monitoreo y riego automatico',
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/auth/login');
  }

  const cultivosData = await getDashboardData();

  return (
    <Box
      className="page-content"
      px={{ initial: "4", sm: "5", md: "6" }}
      py={{ initial: "4", sm: "5", md: "6" }}
    >
      <Box mb="5">
        <Heading size={{ initial: "6", sm: "7", md: "8" }} style={{ color: 'white', wordBreak: 'break-word' }} mb="1">
          Hola, {session.user.name || 'Agricultor'}! 👋
        </Heading>
        <Text size={{ initial: "2", sm: "3" }} style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          Aquí tienes el resumen en tiempo real de las condiciones de tus cultivos.
        </Text>
      </Box>

      <DashboardClient cultivos={cultivosData as any} />
    </Box>
  );
}
