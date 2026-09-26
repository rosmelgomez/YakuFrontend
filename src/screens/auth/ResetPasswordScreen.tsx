// src/screens/auth/ResetPasswordScreen.tsx
import React, { Suspense } from 'react';
import YakuMark from '@/components/layout/YakuMark';
import RecuperarContrasenaClient from '@/components/auth/RecuperarContrasenaClient';
import { Box, Text, Container } from '@radix-ui/themes';
import { SUPPORT_EMAIL } from '@/config/contact';

export default function ResetPasswordScreen() {
  return (
    <div className="auth-page-wrapper">
      <Container size="1" style={{ width: '100%' }}>
        <Box style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="mx-auto mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-2xl text-[#04130a]" style={{ background: "linear-gradient(145deg, #4ade80, #16a34a)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 12px 32px -10px rgba(22,163,74,0.6)" }}>
            <YakuMark size={38} />
          </div>
          <h1 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '2.5rem', fontWeight: 'bold' }}>
            Yaku
          </h1>
          <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            Sistema de riego inteligente · Lima, Perú
          </Text>
        </Box>

        <Box style={{ display: 'flex', justifyContent: 'center' }}>
          <Suspense fallback={<div style={{ color: 'white', textAlign: 'center' }}>Cargando recuperación...</div>}>
            <RecuperarContrasenaClient />
          </Suspense>
        </Box>

        <Box style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            ¿Problemas para recuperar? →{' '}
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
        }

        @media (min-width: 640px) {
          .auth-page-wrapper {
            padding: 2rem;
          }
        }
      `}} />
    </div>
  );
}
