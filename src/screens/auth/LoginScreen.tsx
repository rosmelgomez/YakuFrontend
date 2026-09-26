// src/screens/auth/LoginScreen.tsx
import React from 'react';
import YakuMark from '@/components/layout/YakuMark';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import { Box, Text, Container } from '@radix-ui/themes';
import { SUPPORT_EMAIL } from '@/config/contact';
import YakuLoader from '@/components/layout/YakuLoader';

export default function LoginScreen() {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Esperar a que se verifique la sesion con el backend antes de decidir:
  // `user` puede venir de localStorage (sesion vieja/expirada) y redirigir
  // de forma optimista al dashboard causaria un parpadeo dashboard->login
  // si la verificacion termina fallando.
  if (isLoading) {
    return <YakuLoader fullScreen />;
  }

  if (isAuthenticated && user) {
    if (user.rol === 'administrador') {
      return <Navigate to="/dashboard/administrador" replace />;
    }
    return <Navigate to="/dashboard/agricultor" replace />;
  }

  return (
    <div className="auth-page-wrapper">
      <div className="auth-glow auth-glow-1" />
      <div className="auth-glow auth-glow-2" />

      <Container size="2" style={{ width: '100%', position: 'relative', zIndex: 1 }}>
        <Box className="auth-fade-in" style={{ textAlign: 'center', marginBottom: '2rem', animationDelay: '0s' }}>
          <div className="auth-logo-badge mx-auto mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-2xl text-[#04130a]" style={{ background: "linear-gradient(145deg, #4ade80, #16a34a)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 12px 32px -10px rgba(22,163,74,0.6)" }}>
            <YakuMark size={38} />
          </div>
          <h1 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '2.5rem', fontWeight: 'bold' }}>
            Yaku
          </h1>
          <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            Sistema de riego inteligente · Lima, Perú
          </Text>
        </Box>

        <Box className="auth-fade-in" style={{ display: 'flex', justifyContent: 'center', animationDelay: '0.12s' }}>
          <LoginForm />
        </Box>

        <Box className="auth-fade-in" style={{ textAlign: 'center', marginTop: '2rem', animationDelay: '0.24s' }}>
          <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            ¿Problemas para acceder? →{' '}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              style={{ color: '#38bdf8', textDecoration: 'underline' }}
            >
              {SUPPORT_EMAIL}
            </a>
          </Text>
        </Box>
      </Container>

      <style dangerouslySetInnerHTML={{ __html: `
        .auth-page-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0c1014;
          padding: 1rem;
          width: 100%;
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
        }

        @media (min-width: 640px) {
          .auth-page-wrapper {
            padding: 2rem;
          }
        }

        .auth-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          opacity: 0.35;
          z-index: 0;
        }

        .auth-glow-1 {
          width: 420px;
          height: 420px;
          top: -120px;
          left: -100px;
          background: radial-gradient(circle, #0d9488 0%, transparent 70%);
          animation: auth-drift-1 14s ease-in-out infinite;
        }

        .auth-glow-2 {
          width: 380px;
          height: 380px;
          bottom: -140px;
          right: -100px;
          background: radial-gradient(circle, #38bdf8 0%, transparent 70%);
          animation: auth-drift-2 16s ease-in-out infinite;
        }

        @keyframes auth-drift-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, 30px) scale(1.1); }
        }

        @keyframes auth-drift-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, -40px) scale(1.08); }
        }

        .auth-logo-badge {
          animation: auth-float 4s ease-in-out infinite;
        }

        @keyframes auth-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        .auth-fade-in {
          opacity: 0;
          animation: auth-fade-in-up 0.6s ease-out forwards;
        }

        @keyframes auth-fade-in-up {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .auth-glow, .auth-logo-badge, .auth-fade-in {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}} />
    </div>
  );
}
