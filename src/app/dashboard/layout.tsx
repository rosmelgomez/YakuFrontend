import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import { Box } from '@radix-ui/themes';
import { NotificationProvider } from '@/components/providers/NotificationProvider';
import PushNotificationManager from '@/components/providers/PushNotificationManager';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  
  const name = session?.user?.name || "JR";
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <Box style={{ minHeight: '100vh', background: '#020817' }}>
      <NotificationProvider>
        <PushNotificationManager />
        <Box className="app-container">
          <Sidebar initials={initials} />
          
          <Box className="main-content">
            {children}
          </Box>
        </Box>
      </NotificationProvider>


      {/* SOLUCIÓN: Usamos una etiqueta style nativa para Server Components */}
      <style dangerouslySetInnerHTML={{
        __html: `
          :root {
            --mobile-nav-height: 68px;
            --mobile-nav-safe: calc(var(--mobile-nav-height) + env(safe-area-inset-bottom, 0px));
          }

          .app-container {
            width: 100%;
            margin: 0 auto;
            position: relative;
            min-height: 100vh;
            background: #020817;
          }

          .main-content {
            /* Margen inferior reservado una sola vez para la barra móvil */
            padding-bottom: calc(var(--mobile-nav-safe) + 12px);
            width: 100%;
            box-sizing: border-box;
          }

          @media (min-width: 1000px) {
            .main-content {
              padding-bottom: 2rem;
              padding-left: 98px; /* 82px ancho de sidebar + 16px separación */
            }
          }

          /* Estilos centralizados de las páginas para evitar duplicación */
          .page-content {
            width: 100%;
            max-width: none;
            box-sizing: border-box;
            padding-bottom: 0 !important;
          }

          @media (min-width: 1000px) {
            .page-content {
              padding-bottom: 0 !important;
            }
          }
        `
      }} />
    </Box>
  );
}