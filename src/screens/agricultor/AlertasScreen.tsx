// src/screens/agricultor/AlertasScreen.tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box } from '@radix-ui/themes';
import { useAuth } from '@/context/AuthContext';
import { getCultivosBase } from '@/services/cultivos-base';
import { getAlertasData } from '@/services/alertas';
import { getCached, setCached, isCacheValid } from '@/lib/cache';
import DashboardSkeleton from '@/components/layout/DashboardSkeleton';
import NoCropsEmptyState from '@/components/layout/NoCropsEmptyState';
import AlertasClient from '@/components/agricultor/alertas/AlertasClient';

export default function AlertasScreen() {
  const { user } = useAuth();
  const userId = user?.id ? parseInt(user.id, 10) : 0;
  const [searchParams] = useSearchParams();
  const cultivoParam = searchParams.get('cultivo');

  const cacheKey = `alertas_${userId}_${cultivoParam || 'default'}`;
  const cached = getCached<{ cultivos: any[]; data: any }>(cacheKey);
  const isFresh = isCacheValid(cacheKey, 15_000);

  const [loading, setLoading] = useState(!cached);
  const [cultivosBase, setCultivosBase] = useState<any[]>(cached?.cultivos || []);
  const [alertasData, setAlertasData] = useState<{ alertasActivas: any[]; historial: any[] }>(
    cached?.data || { alertasActivas: [], historial: [] }
  );

  useEffect(() => {
    let isMounted = true;
    if (isFresh && cached?.data) {
      setLoading(false);
      return;
    }
    getCultivosBase()
      .then(async (cultivos) => {
        if (!isMounted) return;
        setCultivosBase(cultivos || []);
        if (cultivos && cultivos.length > 0) {
          const selectedId = cultivoParam ? parseInt(cultivoParam, 10) : cultivos[0].id;
          try {
            const data = await getAlertasData(userId, selectedId);
            if (isMounted) {
              const res = data || { alertasActivas: [], historial: [] };
              setAlertasData(res);
              setCached(cacheKey, { cultivos: cultivos || [], data: res });
            }
          } catch (e) {
            console.error("Error al cargar alertas:", e);
          }
        }
      })
      .catch((err) => {
        console.error("Error al conectar con backend:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userId, cultivoParam, cacheKey]);

  if (loading) {
    return (
      <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
        <DashboardSkeleton variant="form" />
      </Box>
    );
  }

  if (cultivosBase.length === 0) {
    return (
      <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
        <NoCropsEmptyState
          title="No tienes alertas activas"
          description="Para monitorear las alertas de humedad, temperatura y nivel de tanque, primero debes registrar tu cultivo."
        />
      </Box>
    );
  }

  const selectedCultivoId = cultivoParam ? parseInt(cultivoParam, 10) : cultivosBase[0].id;

  return (
    <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
      <AlertasClient
        userId={userId}
        cultivos={cultivosBase}
        initialData={alertasData}
        initialCultivo={selectedCultivoId}
        initialNotifConfig={[]}
        initialHasNotifConfig={false}
        initialPushRegistered={false}
      />
    </Box>
  );
}
