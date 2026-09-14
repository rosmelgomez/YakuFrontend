// src/screens/agricultor/PerfilScreen.tsx
import React, { useEffect, useState } from 'react';
import { Box } from '@radix-ui/themes';
import { useAuth } from '@/context/AuthContext';
import { obtenerPerfil } from '@/actions/profile';
import DashboardSkeleton from '@/components/layout/DashboardSkeleton';
import PerfilClient from '@/components/agricultor/perfil/PerfilClient';

export default function PerfilScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileUser, setProfileUser] = useState<any>(user);

  useEffect(() => {
    let isMounted = true;
    obtenerPerfil()
      .then((profile) => {
        if (!isMounted) return;
        if (profile) {
          setProfileUser({
            ...profile,
            rol: profile.id_rol === 1 ? 'administrador' : (profile.rol?.nombre || 'agricultor'),
          });
        }
      })
      .catch((err) => {
        console.error("Error al cargar perfil:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <Box className="page-content" px={{ initial: "4", sm: "5", md: "6" }} py={{ initial: "4", sm: "5", md: "6" }}>
        <DashboardSkeleton variant="form" />
      </Box>
    );
  }

  return (
    <Box className="page-content" px={{ initial: "4", sm: "5", md: "6" }} py={{ initial: "4", sm: "5", md: "6" }}>
      <PerfilClient user={profileUser || user} />
    </Box>
  );
}
