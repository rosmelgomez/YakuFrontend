// src/screens/agricultor/ControlScreen.tsx
import React, { useEffect, useState } from 'react';
import { Box } from '@radix-ui/themes';
import { useAuth } from '@/context/AuthContext';
import { getControlData } from '@/services/control';
import { getCultivosBase } from '@/services/cultivos-base';
import type { CultivoBase } from '@/services/cultivos-base';
import { listarModelosML } from '@/actions/ml';
import { getCached, setCached, isCacheValid } from '@/lib/cache';
import DashboardSkeleton from '@/components/layout/DashboardSkeleton';
import NoCropsEmptyState from '@/components/layout/NoCropsEmptyState';
import ControlClient from '@/components/agricultor/control/ControlClient';

export default function ControlScreen() {
  const { user } = useAuth();
  const userId = user?.id ? parseInt(user.id, 10) : 0;

  const cacheKey = `control_${userId}`;
  const cached = getCached<any>(cacheKey);
  const isFresh = isCacheValid(cacheKey, 15_000);

  const [loading, setLoading] = useState(!cached);
  const [cultivosBase, setCultivosBase] = useState<CultivoBase[]>(cached?.cultivos || []);
  const [controlData, setControlData] = useState<any>(cached?.controlData || null);
  const [modelosML, setModelosML] = useState<any[]>(cached?.modelosML || []);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (isFresh && cached?.controlData) {
      setLoading(false);
      return;
    }
    getCultivosBase()
      .then(async (cultivos) => {
        if (!isMounted) return;
        setCultivosBase(cultivos || []);
        if (cultivos && cultivos.length > 0) {
          const selectedId = cultivos[0].id;
          try {
            const [cData, mlRes] = await Promise.all([
              getControlData(userId, selectedId),
              listarModelosML(selectedId).catch(() => ({ success: false, data: [] })),
            ]);
            if (isMounted) {
              setControlData(cData);
              const mList = mlRes?.success && mlRes?.data ? mlRes.data : [];
              setModelosML(mList);
              setCached(cacheKey, {
                cultivos: cultivos || [],
                controlData: cData,
                modelosML: mList,
              });
            }
          } catch (e) {
            console.error("Error al cargar datos de control:", e);
            if (isMounted && !cached) setError("No se pudieron cargar los datos de control.");
          }
        }
      })
      .catch((e) => {
        console.error("Error al conectar con backend:", e);
        if (isMounted && !cached) setError("Error al conectar con el servidor backend.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userId, cacheKey]);

  if (loading) {
    return (
      <Box className="page-content" px={{ initial: "3", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "6" }}>
        <DashboardSkeleton variant="control" />
      </Box>
    );
  }

  if (error) {
    return <div style={{ color: 'white', padding: '2rem' }}>{error}</div>;
  }

  if (cultivosBase.length === 0) {
    return (
      <Box className="page-content" px={{ initial: "3", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "6" }}>
        <NoCropsEmptyState
          title="No tienes control de riego activo"
          description="Para administrar el riego inteligente por IA y supervisar tus bombas y actuadores, primero debes registrar tu cultivo."
        />
      </Box>
    );
  }

  const selectedCultivoId = cultivosBase[0].id;

  return (
    <Box className="page-content" px={{ initial: "3", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "6" }}>
      <ControlClient
        userId={userId}
        cultivos={cultivosBase}
        data={controlData}
        idCultivo={selectedCultivoId}
        modelosML={modelosML}
      />
    </Box>
  );
}
