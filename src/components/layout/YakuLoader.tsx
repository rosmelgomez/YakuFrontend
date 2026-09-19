// src/components/layout/YakuLoader.tsx
import React from 'react';

interface YakuLoaderProps {
  message?: string;
  fullScreen?: boolean;
  minHeight?: string | number;
}

// Mismo spinner de marca usado en login/registro y en el arranque de la app
// (ProtectedRoute, AppRoutes), reutilizado aquí como estado de carga para
// cualquier pantalla del dashboard.
export default function YakuLoader({
  message = 'Cargando Yaku...',
  fullScreen = false,
  minHeight = '60vh',
}: YakuLoaderProps) {
  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      <span className="text-sm text-slate-400">{message}</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#020817] text-white">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-center text-white" style={{ minHeight }}>
      {spinner}
    </div>
  );
}
