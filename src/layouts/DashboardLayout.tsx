// src/layouts/DashboardLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { Box } from '@radix-ui/themes';
import { NotificationProvider } from '@/components/providers/NotificationProvider';
import PushNotificationManager from '@/components/providers/PushNotificationManager';

export default function DashboardLayout() {
  const { user } = useAuth();
  
  const name = user?.name || "JR";
  const initials = name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || "JR";

  return (
    <Box style={{ minHeight: '100vh', background: '#020817' }}>
      <NotificationProvider>
        <PushNotificationManager />
        <Box className="app-container">
          <Sidebar initials={initials} />
          
          <Box className="main-content">
            <TopBar />
            <Outlet />
          </Box>
        </Box>
      </NotificationProvider>
    </Box>
  );
}
