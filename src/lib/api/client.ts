// src/lib/api/client.ts

import { refreshSession } from '@/lib/api/session-refresh';

// Siempre relativa: el navegador nunca debe contactar localhost/IP privada
// directamente (dispara el permiso "Local Network Access" de Chrome cuando
// la app se sirve desde un origen publico como un devtunnel). El backend
// real se resuelve via el proxy de Vite en dev o el reverse proxy en prod.
export const FASTAPI_BASE_URL = '/api';

function resolveEndpoint(endpoint: string) {
  return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
}

export async function fetchPublicFastAPI(endpoint: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  const path = resolveEndpoint(endpoint);
  const url = endpoint.startsWith('http') ? endpoint : `${FASTAPI_BASE_URL}${path}`;

  const fetchOptions: RequestInit = {
    ...options,
    credentials: 'include',
    headers,
  };

  return fetch(url, fetchOptions);
}

export async function fetchFromFastAPI(endpoint: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  const token = typeof window !== 'undefined' ? localStorage.getItem('yaku_token') : null;
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const path = resolveEndpoint(endpoint);
  const url = endpoint.startsWith('http') ? endpoint : `${FASTAPI_BASE_URL}${path}`;

  const fetchOptions: RequestInit = {
    ...options,
    credentials: 'include',
    headers,
  };

  const response = await fetch(url, fetchOptions);

  // Si da 401, intentar refrescar
  if (response.status === 401 && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
    if (await refreshSession(FASTAPI_BASE_URL)) return fetch(url, fetchOptions);
  }

  return response;
}
