// src/screens/administrador/BackupScreen.tsx
import React from 'react';
import { Box } from '@radix-ui/themes';
import RespaldoClient from '@/components/administrador/respaldo/RespaldoClient';

export default function BackupScreen() {
  return (
    <Box className="page-content" px={{ initial: "4", sm: "5", md: "6" }} py={{ initial: "4", sm: "5", md: "6" }}>
      <RespaldoClient />
    </Box>
  );
}
