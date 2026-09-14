// src/shims/next-auth-react.ts
export { useSession, signOut } from '@/context/AuthContext';
export { default as SessionProvider } from '@/components/providers/SessionProvider';

export async function signIn(provider: string, options?: any) {
  if (provider === 'credentials') {
    const { correo, contrasena, token } = options || {};
    try {
      const { apiClient } = await import('@/services/apiClient');
      if (token && token.trim()) {
        const userData = await apiClient('/auth/verify-credentials', {
          method: 'POST',
          body: JSON.stringify({ correo, token }),
        });
        localStorage.setItem('yaku_user', JSON.stringify(userData));
        return { ok: true, error: null };
      }

      await apiClient('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ usuario: correo, contrasena }),
      });

      const userData = await apiClient('/auth/verify-credentials', {
        method: 'POST',
        body: JSON.stringify({ correo, contrasena }),
      });

      localStorage.setItem('yaku_user', JSON.stringify(userData));
      return { ok: true, error: null };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Error de inicio de sesión' };
    }
  }
  return { ok: false, error: 'Proveedor no compatible' };
}
