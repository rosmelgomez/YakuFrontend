'use client';

import React from 'react';
import { AlertTriangle, X, Droplet, Thermometer } from 'lucide-react';

interface FloatingToastProps {
  alerta: {
    id: string;
    titulo: string;
    mensaje: string;
    severidad: 'info' | 'advertencia' | 'critica';
    valor?: number;
  };
  onClose: () => void;
}

export default function FloatingToast({ alerta, onClose }: FloatingToastProps) {
  // Configuración de estilos y colores premium (dark theme glassmorphism)
  const styles = {
    info: {
      gradient: 'from-blue-500/10 to-cyan-500/10',
      border: 'border-blue-500/30 hover:border-blue-500/50',
      shadow: 'shadow-blue-500/5',
      text: 'text-blue-400',
      icon: <Droplet className="w-5 h-5 text-blue-400 animate-pulse" />
    },
    advertencia: {
      gradient: 'from-amber-500/10 to-orange-500/10',
      border: 'border-amber-500/30 hover:border-amber-500/50',
      shadow: 'shadow-amber-500/5',
      text: 'text-amber-400',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 animate-bounce" />
    },
    critica: {
      gradient: 'from-red-500/10 to-rose-500/10',
      border: 'border-red-500/30 hover:border-red-500/50',
      shadow: 'shadow-red-500/5',
      text: 'text-red-400',
      icon: <AlertTriangle className="w-5 h-5 text-red-400 animate-bounce" />
    }
  }[alerta.severidad] || {
    gradient: 'from-slate-500/10 to-slate-500/10',
    border: 'border-slate-500/30',
    shadow: 'shadow-slate-500/5',
    text: 'text-slate-400',
    icon: <AlertTriangle className="w-5 h-5 text-slate-400" />
  };

  return (
    <div className={`fixed top-6 right-6 z-[9999] flex items-start gap-4 p-4 w-96 rounded-xl border backdrop-blur-md bg-slate-950/80 bg-gradient-to-br ${styles.gradient} ${styles.border} ${styles.shadow} shadow-2xl transition-all duration-300 animate-slide-in`}>
      <div className="flex-shrink-0 mt-0.5">
        {styles.icon}
      </div>
      
      <div className="flex-grow min-w-0">
        <h4 className={`text-sm font-semibold tracking-wide ${styles.text}`}>{alerta.titulo}</h4>
        <p className="text-xs text-slate-300 mt-1 leading-relaxed break-words">{alerta.mensaje}</p>
        {alerta.valor !== undefined && (
          <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-900 border border-slate-800 text-slate-400">
            Valor leido: {alerta.valor}
          </span>
        )}
      </div>

      <button 
        onClick={onClose} 
        className="flex-shrink-0 text-slate-500 hover:text-white transition-colors duration-150 p-1 hover:bg-slate-900/50 rounded-lg"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Animaciones CSS personalizadas */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slideIn {
            from {
              transform: translateX(100px) scale(0.95);
              opacity: 0;
            }
            to {
              transform: translateX(0) scale(1);
              opacity: 1;
            }
          }
          .animate-slide-in {
            animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `
      }} />
    </div>
  );
}
