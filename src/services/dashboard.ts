// src/services/dashboard.ts
import { fetchFromFastAPI } from "@/lib/bff";

export async function getDashboardData() {
  const res = await fetchFromFastAPI("/dashboard/data");
  if (!res.ok) {
    throw new Error("Error al obtener datos del dashboard desde FastAPI");
  }
  return res.json();
}