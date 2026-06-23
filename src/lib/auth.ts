import { NextAuthOptions, Session } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { JWT } from 'next-auth/jwt'
import { fetchPublicFastAPI } from '@/lib/api/client'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        correo: { label: 'Correo', type: 'email' },
        contrasena: { label: 'Contraseña', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.correo || !credentials?.contrasena) {
          throw new Error('Correo y contraseña requeridos')
        }

        const res = await fetchPublicFastAPI('/auth/verify-credentials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            correo: credentials.correo,
            contrasena: credentials.contrasena,
          }),
        });

        if (!res.ok) {
          const errMsg = await res.text();
          let parsedError = 'Correo o contraseña incorrectos';
          try {
            const jsonErr = JSON.parse(errMsg);
            const detail = jsonErr.detail;
            // Para prevenir la enumeración de usuarios (vulnerabilidad de seguridad),
            // mostramos un mensaje genérico para cualquier error relacionado con credenciales
            if (detail && 
                !detail.toLowerCase().includes('contrase') && 
                !detail.toLowerCase().includes('correo') && 
                !detail.toLowerCase().includes('usuario') &&
                !detail.toLowerCase().includes('inexistente') &&
                !detail.toLowerCase().includes('credentials') &&
                !detail.toLowerCase().includes('not found') &&
                res.status !== 401 &&
                res.status !== 404) {
              parsedError = detail;
            }
          } catch (e) {}
          throw new Error(parsedError);
        }

        const usuario = await res.json();

        return {
          id: usuario.id,
          name: usuario.name,
          email: usuario.email,
          rol: usuario.rol
        }
      }
    })
  ],
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/login',
    error: '/auth/login'
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: any }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.rol = user.rol
      }
      return token
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        (session.user as any).id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.rol = token.rol as string
      }
      return session
    }
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60 // 8 horas
  },
  secret: process.env.NEXTAUTH_SECRET
}
