import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createBffToken } from "@/lib/bff-token";

function getFastAPIUrl() {
  const configuredUrl = process.env.FASTAPI_API_URL?.trim().replace(/\/$/, "");
  if (configuredUrl) return configuredUrl;
  if (process.env.NODE_ENV === "production") {
    throw new Error("FASTAPI_API_URL es obligatoria en produccion");
  }
  return "http://127.0.0.1:8000";
}

function resolveEndpoint(endpoint: string) {
  return endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
}

function requestSignal(signal?: AbortSignal | null) {
  return signal ?? AbortSignal.timeout(15_000);
}

export async function fetchPublicFastAPI(endpoint: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  const path = resolveEndpoint(endpoint);

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    signal: requestSignal(options.signal),
  };
  if (!options.cache && !options.next) {
    fetchOptions.cache = "no-store";
  }

  return fetch(`${getFastAPIUrl()}${path}`, fetchOptions);
}

export async function fetchFromFastAPI(endpoint: string, options: RequestInit = {}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("No autorizado: Sesion de usuario invalida");
  }

  const headers = new Headers(options.headers);
  headers.set("X-BFF-Token", createBffToken(session.user.id));
  const path = resolveEndpoint(endpoint);

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    signal: requestSignal(options.signal),
  };
  if (!options.cache && !options.next) {
    fetchOptions.cache = "no-store";
  }

  return fetch(`${getFastAPIUrl()}${path}`, fetchOptions);
}
