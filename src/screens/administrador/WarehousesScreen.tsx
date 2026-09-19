// src/screens/administrador/WarehousesScreen.tsx
import React, { useEffect, useState } from 'react';
import { Box } from '@radix-ui/themes';
import YakuLoader from '@/components/layout/YakuLoader';
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
      <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
        <YakuLoader />
      </Box>
    );
  }

  return (
    <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
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
