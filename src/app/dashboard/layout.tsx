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
          .app-container {
            width: 100%;
            margin: 0 auto;
            position: relative;
            min-height: 100vh;
            background: #020817;
          }

          .main-content {
            padding-bottom: 70px; /* Margen para el navbar en celulares */
            width: 100%;
            box-sizing: border-box;
          }

          @media (min-width: 1000px) {
            .main-content {
              padding-bottom: 0;
              padding-left: 80px; /* Margen exacto del ancho del sidebar en PC */
            }
          }

          /* Estilos centralizados de las páginas para evitar duplicación */
          .page-content {
            width: 100%;
            box-sizing: border-box;
            padding-bottom: 90px !important;
          }

          @media (min-width: 1000px) {
            .page-content {
              padding-bottom: 2rem !important;
              padding-left: 24px !important;
            }
          }
        `
      }} />
    </Box>
  );
}