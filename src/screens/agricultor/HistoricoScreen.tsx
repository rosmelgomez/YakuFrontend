// src/screens/agricultor/HistoricoScreen.tsx
import React, { useEffect, useState } from 'react';
import { Box, Text } from '@radix-ui/themes';
import { useAuth } from '@/context/AuthContext';
import { getCultivosBase } from '@/services/cultivos-base';
import { getHistoricoData } from '@/services/historico';
import { getCached, setCached, isCacheValid } from '@/lib/cache';
import DashboardSkeleton from '@/components/layout/DashboardSkeleton';
import NoCropsEmptyState from '@/components/layout/NoCropsEmptyState';
import HistoricoMultiChart from '@/components/agricultor/historico/HistoricoMultiChart';

export default function HistoricoScreen() {
  const { user } = useAuth();
  const userId = user?.id ? parseInt(user.id, 10) : 0;

  const cacheKey = `historico_${userId}`;
  const cached = getCached<{ cultivos: any[]; data: any }>(cacheKey);
  const isFresh = isCacheValid(cacheKey, 30_000);

  const [loading, setLoading] = useState(!cached);
  const [cultivosBase, setCultivosBase] = useState<any[]>(cached?.cultivos || []);
  const [historicoData, setHistoricoData] = useState<any>(cached?.data || null);
  const [error, setError] = useState<string | null>(null);

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
          const selectedId = cultivos[0].id;
          const hist = await getHistoricoData(userId, selectedId, 7);
          if (isMounted) {
            setHistoricoData(hist);
            setCached(cacheKey, { cultivos: cultivos || [], data: hist });
          }
        }
      })
      .catch((err) => {
        if (isMounted && !cached) {
          console.error("Error al cargar histórico:", err);
          setError("Error al conectar con el servidor backend.");
        }
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
      <Box className="page-content" px={{ initial: "4", sm: "5", md: "6" }} py={{ initial: "4", sm: "5", md: "6" }}>
        <DashboardSkeleton variant="chart" />
      </Box>
    );
  }

  if (error) {
    return <Text color="red" style={{ padding: '2rem' }}>{error}</Text>;
  }

  if (cultivosBase.length === 0) {
    return (
      <Box className="page-content" px={{ initial: "4", sm: "5", md: "6" }} py={{ initial: "4", sm: "5", md: "6" }}>
        <NoCropsEmptyState
          title="No tienes historial de telemetría"
          description="Para visualizar los gráficos históricos de humedad de suelo, humedad ambiente y temperatura, primero debes registrar tu cultivo."
        />
      </Box>
    );
  }

  const selectedCultivoId = cultivosBase[0].id;

  return (
    <Box className="page-content" px={{ initial: "4", sm: "5", md: "6" }} py={{ initial: "4", sm: "5", md: "6" }}>
      <HistoricoMultiChart
        userId={userId}
        cultivos={cultivosBase}
        initialData={historicoData}
        initialCultivo={selectedCultivoId.toString()}
        initialRango={7}
      />
    </Box>
  );
}
