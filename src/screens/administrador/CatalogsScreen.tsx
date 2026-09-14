// src/screens/administrador/CatalogsScreen.tsx
import React, { useEffect, useState } from 'react';
import { Box } from '@radix-ui/themes';
import DashboardSkeleton from '@/components/layout/DashboardSkeleton';
import { listarPlantas, listarTiposMetrica } from '@/actions/admin';
import { listarRegiones, listarTodasProvincias, listarTodosDistritos } from '@/actions/crops';
import CatalogoClient from '@/components/administrador/catalogo/CatalogoClient';

export default function CatalogsScreen() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({});

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      listarPlantas().catch(() => []),
      listarRegiones().catch(() => []),
      listarTodasProvincias().catch(() => []),
      listarTodosDistritos().catch(() => []),
      listarTiposMetrica().catch(() => []),
    ]).then(([catalogPlantas, regiones, provincias, distritos, metricas]) => {
      if (!isMounted) return;
      setData({
        catalogPlantas,
        regiones,
        provincias,
        distritos,
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
      <Box className="page-content" px={{ initial: "4", sm: "5", md: "6" }} py={{ initial: "4", sm: "5", md: "6" }}>
        <DashboardSkeleton variant="admin" />
      </Box>
    );
  }

  return (
    <Box className="page-content" px={{ initial: "4", sm: "5", md: "6" }} py={{ initial: "4", sm: "5", md: "6" }}>
      <CatalogoClient
        catalogPlantas={data.catalogPlantas}
        regiones={data.regiones}
        provincias={data.provincias}
        distritos={data.distritos}
        metricas={data.metricas}
      />
    </Box>
  );
}
