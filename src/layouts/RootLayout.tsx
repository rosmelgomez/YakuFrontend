// src/layouts/RootLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import '@/index.css';
import { AuthProvider } from '@/context/AuthContext';
import FormToastProvider from '@/components/ui/FormToastProvider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Theme appearance="dark">
        <FormToastProvider />
        <div className="min-h-full flex flex-col flex-1">
          <Outlet />
        </div>
      </Theme>
    </AuthProvider>
  );
}
