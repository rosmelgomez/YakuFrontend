// src/screens/administrador/UsersScreen.tsx
import React, { useEffect, useState } from 'react';
import { Box } from '@radix-ui/themes';
import DashboardSkeleton from '@/components/layout/DashboardSkeleton';
import { listarUsuarios, listarDispositivos } from '@/actions/admin';
import { listarTodosCultivos } from '@/actions/crops';
import UsuariosClient from '@/components/administrador/usuarios/UsuariosClient';

export default function UsersScreen() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [crops, setCrops] = useState<any[]>([]);

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
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
        <DashboardSkeleton variant="admin" />
      </Box>
    );
  }

  return (
    <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
      <UsuariosClient
        initialUsers={users}
        initialDevices={devices}
        initialCrops={crops}
        activeTab="usuarios"
      />
    </Box>
  );
}
