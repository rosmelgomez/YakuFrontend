// src/screens/administrador/DevicesScreen.tsx
import React, { useEffect, useState } from 'react';
import { Box } from '@radix-ui/themes';
import YakuLoader from '@/components/layout/YakuLoader';
import {
  listarUsuarios,
  listarDispositivos,
  listarTiposDispositivo,
  listarTiposComponente,
  listarComponentes,
  listarTiposMetrica
} from '@/actions/admin';
import { listarTodosCultivos, listarFuentesAgua } from '@/actions/crops';
import { listarAlmacenes } from '@/actions/almacenes';
import DispositivosClient from '@/components/administrador/dispositivos/DispositivosClient';

export default function DevicesScreen({
  activeTab = "dispositivos",
}: {
  activeTab?: "dispositivos" | "componentes" | "asignar" | "all";
} = {}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({});

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      listarUsuarios().catch(() => []),
      listarDispositivos().catch(() => []),
      listarTodosCultivos().catch(() => []),
      listarTiposDispositivo().catch(() => []),
      listarTiposComponente().catch(() => []),
      listarAlmacenes().catch(() => []),
      listarComponentes().catch(() => []),
      listarFuentesAgua().catch(() => []),
      listarTiposMetrica().catch(() => []),
    ]).then(([users, devices, crops, tiposDispositivo, tiposComponente, almacenes, components, fuentesAgua, metricas]) => {
      if (!isMounted) return;
      setData({
        users,
        devices,
        crops,
        tiposDispositivo,
        tiposComponente,
        almacenes,
        components,
        fuentesAgua,
        metricas,
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
      <DispositivosClient
        initialUsers={data.users}
        initialDevices={data.devices}
        initialCrops={data.crops}
        tiposDispositivo={data.tiposDispositivo}
        tiposComponente={data.tiposComponente}
        initialAlmacenes={data.almacenes}
        initialComponents={data.components}
        fuentesAgua={data.fuentesAgua}
        metricas={data.metricas}
        activeTab={activeTab}
      />
    </Box>
  );
}
