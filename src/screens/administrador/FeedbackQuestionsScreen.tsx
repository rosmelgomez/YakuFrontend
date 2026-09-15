// src/screens/administrador/FeedbackQuestionsScreen.tsx
import React, { useEffect, useState } from 'react';
import { Box } from '@radix-ui/themes';
import DashboardSkeleton from '@/components/layout/DashboardSkeleton';
import { listarPreguntasFeedback, obtenerKpisFeedback } from '@/actions/feedback';
import type { FeedbackKpisResponse, FeedbackPregunta } from '@/actions/feedback';
import FeedbackAdminClient from '@/components/administrador/feedback/FeedbackAdminClient';

export default function FeedbackQuestionsScreen() {
  const [loading, setLoading] = useState(true);
  const [preguntas, setPreguntas] = useState<FeedbackPregunta[]>([]);
  const [kpis, setKpis] = useState<FeedbackKpisResponse | null>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      listarPreguntasFeedback(true),
      obtenerKpisFeedback().catch((err) => {
        console.warn("No se pudieron cargar los KPIs de feedback:", err);
        return null;
      }),
    ])
      .then(([preg, kpiData]) => {
        if (!isMounted) return;
        setPreguntas(preg || []);
        setKpis(kpiData);
      })
      .catch((err) => {
        console.error("Error al cargar feedback de administración:", err);
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
        <DashboardSkeleton variant="admin" />
      </Box>
    );
  }

  return (
    <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
      <FeedbackAdminClient initialPreguntas={preguntas} initialKpis={kpis} />
    </Box>
  );
}
