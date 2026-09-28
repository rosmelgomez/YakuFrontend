// src/screens/administrador/UsersScreen.tsx
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Box } from '@radix-ui/themes';
import YakuLoader from '@/components/layout/YakuLoader';
import { listarUsuarios, listarDispositivos } from '@/actions/admin';
import { listarTodosCultivos } from '@/actions/crops';
import UsuariosClient from '@/components/administrador/usuarios/UsuariosClient';

export default function UsersScreen() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  // UsuariosClient copia la lista en su estado: se remonta cuando llegan datos nuevos.
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      listarUsuarios().catch(() => []),
      listarDispositivos().catch(() => []),
      listarTodosCultivos().catch(() => []),
    ]).then(([u, d, c]) => {
      if (!isMounted) return;
      setUsers(u);
      setDevices(d);
      setCrops(c);
      setDataVersion((v) => v + 1);
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
    // location.key cambia en cada navegación: al abrir una notificación de nuevo
    // registro estando ya en esta página, se recarga la lista para incluirlo.
  }, [location.key]);

  // #solicitudes (enlace de la notificación de nuevo registro): llevar a las pendientes.
  useEffect(() => {
    if (loading || location.hash !== '#solicitudes') return;
    document.getElementById('solicitudes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [loading, location.key, location.hash]);

  if (loading) {
    return (
      <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
        <YakuLoader />
      </Box>
    );
  }

  return (
    <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
      <UsuariosClient
        key={dataVersion}
        initialUsers={users}
        initialDevices={devices}
        initialCrops={crops}
        activeTab="usuarios"
      />
    </Box>
  );
}
