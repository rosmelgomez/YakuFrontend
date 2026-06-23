// src/app/dashboard/agricultor/perfil/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import { authOptions } from '@/lib/auth';
import { Box } from '@radix-ui/themes';
import DashboardSkeleton from '@/components/layout/DashboardSkeleton';
import { obtenerPerfil } from '@/actions/profile';

export const metadata = {
  title: 'Mi Perfil - Yaku',
  description: 'Gestión de datos de usuario y seguridad en la red Yaku',
};

export const dynamic = 'force-dynamic';

const PerfilClient = nextDynamic(() => import('@/components/agricultor/perfil/PerfilClient'), {
  loading: () => <DashboardSkeleton variant="form" />,
});

export default async function PerfilPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/auth/login');
  }

  // 2. Cargar perfil completo desde el backend
  const profile = await obtenerPerfil().catch(() => {
    return null;
  });

  const activeUser = profile 
    ? {
        ...profile,
        rol: profile.id_rol === 1 ? 'administrador' : 'agricultor'
      }
    : session.user;

  return (
    <Box className="page-content" style={{ padding: '2rem 0' }}>
      <Box style={{ width: '100%', maxWidth: '100%', paddingLeft: '16px', paddingRight: '16px' }}>
        <PerfilClient user={activeUser} />
      </Box>
    </Box>
  );
}
