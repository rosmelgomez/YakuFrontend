// src/app/auth/login/page.tsx

import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import LoginForm from '@/components/auth/LoginForm'
import { Box, Text, Container } from '@radix-ui/themes'
import { authOptions } from '@/lib/auth' // Asegúrate de que esta ruta apunte a tu auth.ts

export const metadata = {
  title: 'Inicio de Sesión - Yaku',
  description: 'Inicia sesión en tu cuenta de Yaku'
}

export default async function LoginPage() {
  // Pasamos authOptions para que la sesión se evalúe correctamente en el servidor
  const session = await getServerSession(authOptions)
  
  if (session) {
    redirect('/dashboard/agricultor')
  }

  return (
    <div className="auth-page-wrapper">
      <Container size="2" style={{ width: '100%' }}>
        <Box style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            margin: '0 auto 1rem',
            background: 'white',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem'
          }}>
            🌊
          </div>
          <h1 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '2.5rem', fontWeight: 'bold' }}>
            Yaku
          </h1>
          <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            Sistema de riego inteligente · Lima, Perú
          </Text>
        </Box>

        <Box style={{ display: 'flex', justifyContent: 'center' }}>
          <LoginForm />
        </Box>

        <Box style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            ¿Problemas para acceder? → soporte@yaku.pe
          </Text>
        </Box>
      </Container>

      <style dangerouslySetInnerHTML={{ __html: `
        .auth-page-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #020817;
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
  )
}
