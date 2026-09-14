// src/lib/api/client.ts

export const FASTAPI_BASE_URL = import.meta.env.VITE_FASTAPI_URL || '/api';

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
    try {
      const refreshRes = await fetch(`${FASTAPI_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (refreshRes.ok) {
        return fetch(url, fetchOptions);
      }
    } catch {}
  }

  return response;
}
