// src/actions/mqttConfig.ts

import { fetchFromFastAPI } from "@/lib/bff";

async function parseErrorText(res: any): Promise<string> {
  try {
    const text = await res.text();
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.detail === "string") return parsed.detail;
    } catch {
      // Not JSON
    }
    return text || res.statusText || "Error en el servidor";
  } catch {
    return "Error desconocido";
  }
}

export async function obtenerMqttConfig() {
  try {
    const res = await fetchFromFastAPI("/admin/mqtt-config");
    if (!res.ok) {
      const errorMsg = await parseErrorText(res);
      return { success: false, error: errorMsg };
    }
    return { success: true, data: await res.json() };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al obtener la configuración MQTT" };
  }
}

export async function actualizarMqttConfig(payload: {
  host: string;
  port: number;
  username?: string;
  password?: string;
  usarTls: boolean;
}) {
  try {
    const res = await fetchFromFastAPI("/admin/mqtt-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: payload.host,
        port: payload.port,
        username: payload.username || null,
        password: payload.password || null,
        usar_tls: payload.usarTls,
      }),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorText(res);
      return { success: false, error: errorMsg };
    }
    return { success: true, data: await res.json() };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar la configuración MQTT" };
  }
}
