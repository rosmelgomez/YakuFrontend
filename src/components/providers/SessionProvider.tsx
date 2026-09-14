// src/components/providers/SessionProvider.tsx

import { ReactNode } from 'react'
import { AuthProvider } from '@/context/AuthContext'

export default function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}
