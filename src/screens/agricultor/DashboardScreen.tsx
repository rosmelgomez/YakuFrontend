// src/screens/agricultor/DashboardScreen.tsx
import React, { useEffect, useState } from 'react';
import { Box, Heading, Text } from '@radix-ui/themes';
import { useAuth } from '@/context/AuthContext';
import { getDashboardData } from '@/services/dashboard';
import { getCached, setCached, isCacheValid } from '@/lib/cache';
import YakuLoader from '@/components/layout/YakuLoader';
import DashboardClient, { CalendarRange } from '@/components/agricultor/dashboard/DashboardClient';
import { aplicarLecturasEnVivo } from '@/components/agricultor/dashboard/live';

export default function DashboardScreen() {
  const { user } = useAuth();
  const cached = getCached<any[]>('dashboard_data');
  const isFresh = isCacheValid('dashboard_data', 20_000);
  const [cultivosData, setCultivosData] = useState<any[] | null>(cached);
  const [loading, setLoading] = useState<boolean>(!cached);
  const [error, setError] = useState<string | null>(null);
  // Rango del modo Calendario: se piden a la BD los datos de esas fechas (como en el panel admin).
  const [calendarRange, setCalendarRange] = useState<CalendarRange | null>(null);
  const [rangeData, setRangeData] = useState<any[] | null>(null);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);

  useEffect(() => {
    if (!calendarRange) {
      setRangeData(null);
      setRangeError(null);
      return;
    }
    let isMounted = true;
    setRangeLoading(true);
    getDashboardData(calendarRange)
      .then((data) => {
        if (isMounted) {
          setRangeData(data || []);
          setRangeError(null);
        }
      })
      .catch((err) => {
        console.error("Error al cargar rango del dashboard:", err);
        if (isMounted) setRangeError("No se pudieron cargar los datos del rango seleccionado.");
      })
      .finally(() => {
        if (isMounted) setRangeLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [calendarRange]);

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

  // Datos en vivo: el colector reporta cada minuto y el backend reenvía la
  // lectura guardada (ya calibrada) por WebSocket ("yaku:control_update",
  // event "telemetria", campo `lecturas`). Se aplica al instante sin recargar.
  // La recarga completa queda como respaldo: si un evento llega sin lecturas,
  // cada 60 s por si el WebSocket se cae, y al volver a la pestaña (el
  // navegador pausa los temporizadores en segundo plano).
  useEffect(() => {
    let lastFetch = Date.now();
    let inFlight = false;
    const refetch = (forzar = false) => {
      if (inFlight || (!forzar && Date.now() - lastFetch < 20_000)) return;
      inFlight = true;
      lastFetch = Date.now();
      getDashboardData()
        .then((data) => {
          setCultivosData(data || []);
          setCached('dashboard_data', data || []);
        })
        .catch(() => {})
        .finally(() => { inFlight = false; });
    };
    const onControlUpdate = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.event !== 'telemetria') return;
      const lecturas = detail.lecturas;
      if (detail.id_cultivo && lecturas && Object.keys(lecturas).length > 0) {
        setCultivosData((prev) => {
          const next = aplicarLecturasEnVivo(prev, detail.id_cultivo, lecturas);
          if (next) setCached('dashboard_data', next);
          return next;
        });
        return;
      }
      refetch();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') refetch(true);
    };
    const onWsStatus = (event: Event) => {
      // Al reconectar se pudo perder algún evento: se sincroniza de inmediato.
      if ((event as CustomEvent).detail?.conectado) refetch(true);
    };
    window.addEventListener('yaku:control_update', onControlUpdate);
    window.addEventListener('yaku:ws_status', onWsStatus);
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(() => refetch(), 60_000);
    return () => {
      window.removeEventListener('yaku:control_update', onControlUpdate);
      window.removeEventListener('yaku:ws_status', onWsStatus);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
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
          ¡Hola, {user?.name || 'Agricultor'}!
        </Heading>
        <Text size={{ initial: "1", sm: "2" }} style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          Aquí tienes el resumen en tiempo real de las condiciones de tus cultivos.
        </Text>
      </Box>

      {error ? (
        <Text color="red" style={{ padding: '1rem' }}>{error}</Text>
      ) : (
        <DashboardClient
          cultivos={cultivosData as any}
          cultivosRango={rangeData as any}
          onCalendarRangeChange={setCalendarRange}
          rangeLoading={rangeLoading}
          rangeError={rangeError}
        />
      )}
    </Box>
  );
}
