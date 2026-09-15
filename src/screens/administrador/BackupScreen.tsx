// src/screens/administrador/BackupScreen.tsx
import React from 'react';
import { Box } from '@radix-ui/themes';
import RespaldoClient from '@/components/administrador/respaldo/RespaldoClient';

export default function BackupScreen() {
  return (
    <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
      <RespaldoClient />
    </Box>
  );
}
