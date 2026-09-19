// src/screens/administrador/AdminDashboardScreen.tsx
import React, { useEffect, useState } from 'react';
import { Box, Card, Text } from '@radix-ui/themes';
import { obtenerResumenAdmin } from '@/actions/admin';
import YakuLoader from '@/components/layout/YakuLoader';
import AdminDashboardClient from '@/components/administrador/dashboard/AdminDashboardClient';

export default function AdminDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    obtenerResumenAdmin()
      .then((data) => {
        if (isMounted) setSummary(data);
      })
      .catch((err) => {
        console.error("Error al cargar resumen admin:", err);
        if (isMounted) setError("Error al conectar con el backend de FastAPI.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
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

  if (error || !summary) {
    return (
      <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
        <Card size="3" style={{ background: '#111827', borderColor: '#ef4444' }}>
          <Text color="red" weight="bold" size="3">
            {error || "Error al conectar con el backend de FastAPI. Asegúrese de que el servidor esté activo."}
          </Text>
        </Card>
      </Box>
    );
  }

  return (
    <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
      <AdminDashboardClient data={summary} />
    </Box>
  );
}
