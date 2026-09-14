// src/services/apiClient.ts

export const API_BASE_URL = import.meta.env.VITE_FASTAPI_URL || '/api';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
}

// Mapa para deduplicar peticiones GET en vuelo idénticas
const inFlightRequests = new Map<string, Promise<any>>();

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers, ...customConfig } = options;
  const method = (customConfig.method || 'GET').toUpperCase();

  let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  // Deduplicación en vuelo solo para peticiones GET
  if (method === 'GET' && inFlightRequests.has(url)) {
    return inFlightRequests.get(url)!;
  }

  const fetchPromise = (async () => {
    const token = localStorage.getItem('yaku_token');

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    };

    const response = await fetch(url, {
      credentials: 'include',
      headers: defaultHeaders,
      ...customConfig,
    });

  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    // Intentar refrescar la sesión si hay un endpoint disponible
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (refreshRes.ok) {
        // Reintentar la solicitud original
        const retryRes = await fetch(url, {
          credentials: 'include',
          headers: defaultHeaders,
          ...customConfig,
        });
        if (retryRes.ok) {
          if (retryRes.status === 204) return {} as T;
          return await retryRes.json();
        }
      }
    } catch {
      // Ignorar fallo de refresh y proceder con el error normal
    }
  }

  if (!response.ok) {
    let errorMsg = `Error ${response.status}: ${response.statusText}`;
    let errorData = null;
    try {
      errorData = await response.json();
      if (errorData?.detail) {
        errorMsg = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
      } else if (errorData?.message) {
        errorMsg = errorData.message;
      }
    } catch {
      try {
        errorMsg = await response.text() || errorMsg;
      } catch {}
    }
    throw new ApiError(errorMsg, response.status, errorData);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  return (await response.text()) as unknown as T;
  })();

  if (method === 'GET') {
    inFlightRequests.set(url, fetchPromise);
    fetchPromise.finally(() => {
      inFlightRequests.delete(url);
    });
  }

  return fetchPromise;
}
