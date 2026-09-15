// src/screens/agricultor/PredictivoScreen.tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Text } from '@radix-ui/themes';
import { useAuth } from '@/context/AuthContext';
import { getMLDashboardData } from '@/services/ml';
import { getCultivosBase } from '@/services/cultivos-base';
import { getCached, setCached, isCacheValid } from '@/lib/cache';
import DashboardSkeleton from '@/components/layout/DashboardSkeleton';
import NoCropsEmptyState from '@/components/layout/NoCropsEmptyState';
import MLClient from '@/components/agricultor/ml/MLClient';

export default function PredictivoScreen() {
  const { user } = useAuth();
  const userId = user?.id ? parseInt(user.id, 10) : 0;
  const isAdmin = user?.rol === 'administrador';
  const [searchParams] = useSearchParams();
  const cultivoParam = searchParams.get('cultivo');

  const cacheKey = `ml_${userId}_${cultivoParam || 'default'}`;
  const cached = getCached<{ cultivos: any[]; data: any }>(cacheKey);
  const isFresh = isCacheValid(cacheKey, 30_000);

  const [loading, setLoading] = useState(!cached);
  const [cultivosBase, setCultivosBase] = useState<any[]>(cached?.cultivos || []);
  const [mlData, setMlData] = useState<any>(cached?.data || null);
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
          const selectedId = cultivoParam ? parseInt(cultivoParam, 10) : cultivos[0].id;
          try {
            const data = await getMLDashboardData(userId, selectedId);
            if (isMounted) {
              setMlData(data);
              setCached(cacheKey, { cultivos: cultivos || [], data });
            }
          } catch (e) {
            console.error("Error al cargar ML data:", e);
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
  }, [userId, cultivoParam, cacheKey]);

  if (loading) {
    return (
      <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
        <DashboardSkeleton variant="chart" />
      </Box>
    );
  }

  if (error) {
    return <Text color="red" style={{ padding: '2rem' }}>{error}</Text>;
  }

  if (cultivosBase.length === 0) {
    return (
      <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
        <NoCropsEmptyState
          title="No tienes predicciones de IA activas"
          description="Para consultar las recomendaciones automáticas de riego inteligente generadas por el modelo de Machine Learning, primero debes registrar tu cultivo."
        />
      </Box>
    );
  }

  const selectedCultivoId = cultivoParam ? parseInt(cultivoParam, 10) : cultivosBase[0].id;

  return (
    <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
      <MLClient
        cultivos={cultivosBase}
        data={mlData}
        idCultivo={selectedCultivoId}
        isAdmin={isAdmin}
      />
    </Box>
  );
}
