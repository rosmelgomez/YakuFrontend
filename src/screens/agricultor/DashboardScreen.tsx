// src/screens/agricultor/DashboardScreen.tsx
import React, { useEffect, useState } from 'react';
import { Box, Heading, Text } from '@radix-ui/themes';
import { useAuth } from '@/context/AuthContext';
import { getDashboardData } from '@/services/dashboard';
import { getCached, setCached, isCacheValid } from '@/lib/cache';
import YakuLoader from '@/components/layout/YakuLoader';
import DashboardClient from '@/components/agricultor/dashboard/DashboardClient';

export default function DashboardScreen() {
  const { user } = useAuth();
  const cached = getCached<any[]>('dashboard_data');
  const isFresh = isCacheValid('dashboard_data', 20_000);
  const [cultivosData, setCultivosData] = useState<any[] | null>(cached);
  const [loading, setLoading] = useState<boolean>(!cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (isFresh && cached) {
      setLoading(false);
      return;
    }
    getDashboardData()
      .then((data) => {
        if (isMounted) {
          setCultivosData(data || []);
          setCached('dashboard_data', data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted && !cached) {
          console.error("Error al cargar dashboard:", err);
          setError(err?.message || "Error al conectar con el servidor backend");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <Box className="page-content" px={{ initial: "4", sm: "5", md: "6" }} py={{ initial: "4", sm: "5", md: "6" }}>
        <YakuLoader />
      </Box>
    );
  }

  return (
    <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
      <Box mb={{ initial: "3", sm: "4" }}>
        <Heading size={{ initial: "5", sm: "6", md: "7" }} style={{ color: 'white', wordBreak: 'break-word' }} mb="1">
          Hola, {user?.name || 'Agricultor'}! 👋
        </Heading>
        <Text size={{ initial: "1", sm: "2" }} style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          Aquí tienes el resumen en tiempo real de las condiciones de tus cultivos.
        </Text>
      </Box>

      {error ? (
        <Text color="red" style={{ padding: '1rem' }}>{error}</Text>
      ) : (
        <DashboardClient cultivos={cultivosData as any} />
      )}
    </Box>
  );
}
