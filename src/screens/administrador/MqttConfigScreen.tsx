// src/screens/administrador/MqttConfigScreen.tsx
import React from 'react';
import { Box } from '@radix-ui/themes';
import MqttConfigClient from '@/components/administrador/mqtt/MqttConfigClient';

export default function MqttConfigScreen() {
  return (
    <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
      <MqttConfigClient />
    </Box>
  );
}
