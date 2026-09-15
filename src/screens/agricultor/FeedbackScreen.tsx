// src/screens/agricultor/FeedbackScreen.tsx
import React, { useEffect, useState } from 'react';
import { Box } from '@radix-ui/themes';
import { getCultivosBase } from '@/services/cultivos-base';
import type { CultivoBase } from '@/services/cultivos-base';
import { listarFeedbackPropios, listarPreguntasFeedback } from '@/actions/feedback';
import DashboardSkeleton from '@/components/layout/DashboardSkeleton';
import FeedbackClient from '@/components/agricultor/feedback/FeedbackClient';

export default function FeedbackScreen() {
  const [loading, setLoading] = useState(true);
  const [cultivosBase, setCultivosBase] = useState<CultivoBase[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [preguntas, setPreguntas] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getCultivosBase(),
      listarFeedbackPropios(),
      listarPreguntasFeedback(false),
    ])
      .then(([cultivos, feed, preg]) => {
        if (!isMounted) return;
        setCultivosBase(cultivos || []);
        setFeedback(feed || []);
        setPreguntas(preg || []);
      })
      .catch((err) => {
        console.error("Error al cargar feedback:", err);
        if (isMounted) setError("Error al conectar con el servidor backend.");
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
        <DashboardSkeleton variant="form" />
      </Box>
    );
  }

  if (error) {
    return <div style={{ color: "white", padding: "2rem" }}>{error}</div>;
  }

  return (
    <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
      <FeedbackClient
        cultivos={cultivosBase}
        initialFeedback={feedback}
        preguntas={preguntas}
      />
    </Box>
  );
}
