// src/screens/administrador/AdminDashboardScreen.tsx
import React, { useEffect, useState } from 'react';
import { Box, Card, Text } from '@radix-ui/themes';
import { obtenerResumenAdmin } from '@/actions/admin';
import YakuLoader from '@/components/layout/YakuLoader';
import AdminDashboardClient, { AdminDateRange } from '@/components/administrador/dashboard/AdminDashboardClient';

export default function AdminDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  // null = rango por defecto del backend (7 días hasta el último dato registrado).
  const [range, setRange] = useState<AdminDateRange | null>(null);

  useEffect(() => {
    let isMounted = true;
    setRefreshing(true);
    obtenerResumenAdmin(range ?? undefined)
      .then((data) => {
        if (isMounted) {
          setSummary(data);
          setError(null);
        }
      })
      .catch((err) => {
        console.error("Error al cargar resumen admin:", err);
        if (isMounted) setError("Error al conectar con el backend de FastAPI.");
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [range]);

  if (loading) {
    return (
      <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
        <YakuLoader />
      </Box>
    );
  }

  if (!summary) {
    return (
      <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
        <Card size="3" style={{ background: '#131a1f', borderColor: '#ef4444' }}>
          <Text color="red" weight="bold" size="3">
            {error || "Error al conectar con el backend de FastAPI. Asegúrese de que el servidor esté activo."}
          </Text>
        </Card>
      </Box>
    );
  }

  return (
    <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
      <AdminDashboardClient
        data={summary}
        isCustomRange={range !== null}
        onRangeChange={setRange}
        refreshing={refreshing}
        rangeError={error}
      />
    </Box>
  );
}
