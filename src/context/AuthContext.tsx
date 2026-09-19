// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

export interface User {
  id: string;
  name: string;
  email: string;
  rol: 'agricultor' | 'administrador' | string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (correo: string, contrasena: string, token?: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('yaku_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Verificar la sesión con el backend al arrancar
  useEffect(() => {
    let isMounted = true;

    // Sin 'yaku_user' en localStorage nunca hubo un login exitoso en este
    // navegador, asi que tampoco puede existir la cookie de sesion (access
    // token / refresh token se emiten juntos con ese registro). Evita un
    // GET /auth/perfil que sabemos que va a responder 401 para cualquier
    // visitante nuevo o que ya cerro sesion.
    if (!localStorage.getItem('yaku_user')) {
      setIsLoading(false);
      return;
    }

    apiClient('/auth/perfil')
      .then((perfil) => {
        if (!isMounted) return;
        const normalizedRole = perfil.id_rol === 1 || perfil.rol?.nombre === 'administrador' ? 'administrador' : 'agricultor';
        const updatedUser: User = {
          id: String(perfil.id_usuario),
          name: perfil.nombre ? `${perfil.nombre}${perfil.apellido ? ` ${perfil.apellido}` : ''}`.trim() : perfil.correo,
          email: perfil.correo,
          rol: normalizedRole,
        };
        setUser(updatedUser);
        localStorage.setItem('yaku_user', JSON.stringify(updatedUser));
      })
      .catch(() => {
        if (!isMounted) return;
        // Si el backend responde 401 o falla, limpiar usuario si expiró
        setUser(null);
        localStorage.removeItem('yaku_user');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (correo: string, contrasena: string, token?: string) => {
    setIsLoading(true);
    try {
      if (token && token.trim()) {
        const verifyRes = await apiClient('/auth/verify-credentials', {
          method: 'POST',
          body: JSON.stringify({ correo, token }),
        });
        const u: User = {
          id: String(verifyRes.id),
          name: verifyRes.name,
          email: verifyRes.email,
          rol: verifyRes.rol,
        };
        setUser(u);
        localStorage.setItem('yaku_user', JSON.stringify(u));
        return u;
      }

      // 1. Establecer cookies de sesión en FastAPI
      await apiClient('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ usuario: correo, contrasena }),
      });

      // 2. Obtener datos del usuario autenticado
      const verifyRes = await apiClient('/auth/verify-credentials', {
        method: 'POST',
        body: JSON.stringify({ correo, contrasena }),
      });

      const u: User = {
        id: String(verifyRes.id),
        name: verifyRes.name,
        email: verifyRes.email,
        rol: verifyRes.rol,
      };

      setUser(u);
      localStorage.setItem('yaku_user', JSON.stringify(u));
      return u;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } catch {
      // Si falla logout en backend, igual limpiamos estado local
    }
    setUser(null);
    localStorage.removeItem('yaku_user');
    localStorage.removeItem('yaku_token');
    window.location.href = '/auth/login';
  }, []);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      localStorage.setItem('yaku_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}

// Hook de compatibilidad para código existente que usaba useSession de NextAuth
export function useSession() {
  const { user, isLoading } = useAuth();
  return {
    data: user ? { user } : null,
    status: isLoading ? 'loading' : user ? 'authenticated' : 'unauthenticated',
  };
}

export function signOut(options?: any) {
  try {
    apiClient('/auth/logout', { method: 'POST' }).finally(() => {
      localStorage.removeItem('yaku_user');
      localStorage.removeItem('yaku_token');
      if (options?.redirect !== false) {
        window.location.href = '/auth/login';
      }
    });
  } catch {
    if (options?.redirect !== false) {
      window.location.href = '/auth/login';
    }
  }
}
