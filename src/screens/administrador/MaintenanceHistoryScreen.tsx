// src/screens/administrador/MaintenanceHistoryScreen.tsx
import React from 'react';
import { Box } from '@radix-ui/themes';
import MaintenanceHistoryClient from '@/components/administrador/mantenimiento/MaintenanceHistoryClient';

export default function MaintenanceHistoryScreen() {
  return (
    <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
      <MaintenanceHistoryClient />
    </Box>
  );
}
