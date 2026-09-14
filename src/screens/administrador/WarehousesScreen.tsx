// src/screens/administrador/WarehousesScreen.tsx
import React, { useEffect, useState } from 'react';
import { Box } from '@radix-ui/themes';
import DashboardSkeleton from '@/components/layout/DashboardSkeleton';
import { listarDispositivos } from '@/actions/admin';
import { listarRegiones, listarTodasProvincias, listarTodosDistritos } from '@/actions/crops';
import { listarAlmacenes } from '@/actions/almacenes';
import AlmacenesClient from '@/components/administrador/almacenes/AlmacenesClient';

export default function WarehousesScreen() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({});

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      listarAlmacenes().catch(() => []),
      listarDispositivos().catch(() => []),
      listarRegiones().catch(() => []),
      listarTodasProvincias().catch(() => []),
      listarTodosDistritos().catch(() => []),
    ]).then(([almacenes, devices, regiones, provincias, distritos]) => {
      if (!isMounted) return;
      setData({
        almacenes,
        devices,
        regiones,
        provincias,
        distritos,
      });
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <Box className="page-content" px={{ initial: "4", sm: "5", md: "6" }} py={{ initial: "4", sm: "5", md: "6" }}>
        <DashboardSkeleton variant="admin" />
      </Box>
    );
  }

  return (
    <Box className="page-content" px={{ initial: "4", sm: "5", md: "6" }} py={{ initial: "4", sm: "5", md: "6" }}>
      <AlmacenesClient
        initialAlmacenes={data.almacenes}
        initialDevices={data.devices}
        regiones={data.regiones}
        provincias={data.provincias}
        distritos={data.distritos}
        activeTab="almacenes"
      />
    </Box>
  );
}
