// src/actions/mqttConfig.ts

import { fetchFromFastAPI } from "@/lib/bff";

async function parseErrorText(res: any): Promise<string> {
  try {
    const text = await res.text();
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.detail === "string") return parsed.detail;
      // Errores de validación de FastAPI (422): lista de { loc, msg }.
      if (parsed && Array.isArray(parsed.detail)) {
        return parsed.detail
          .map((item: { loc?: unknown[]; msg?: string }) => {
            const campo = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : "";
            return campo ? `${campo}: ${item.msg}` : item.msg;
          })
          .join(" · ");
      }
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

export type CredencialDispositivo = {
  id_dispositivo: number;
  nombre: string;
  client_id_mqtt: string | null;
  tipo: string | null;
  estado: string | null;
  username: string | null;
  tiene_credencial: boolean;
  fecha_actualizacion: string | null;
};

export async function listarCredencialesMqtt() {
  try {
    const res = await fetchFromFastAPI("/admin/mqtt-config/credenciales");
    if (!res.ok) {
      return { success: false as const, error: await parseErrorText(res) };
    }
    return { success: true as const, data: (await res.json()) as CredencialDispositivo[] };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Error al obtener las credenciales MQTT" };
  }
}

export async function guardarCredencialMqtt(
  idDispositivo: number,
  payload: { username: string; password?: string },
) {
  try {
    const res = await fetchFromFastAPI(`/admin/mqtt-config/credenciales/${idDispositivo}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: payload.username,
        password: payload.password || null,
      }),
    });
    if (!res.ok) {
      return { success: false as const, error: await parseErrorText(res) };
    }
    return { success: true as const, data: (await res.json()) as CredencialDispositivo };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Error al guardar la credencial MQTT" };
  }
}

export async function eliminarCredencialMqtt(idDispositivo: number) {
  try {
    const res = await fetchFromFastAPI(`/admin/mqtt-config/credenciales/${idDispositivo}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      return { success: false as const, error: await parseErrorText(res) };
    }
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Error al eliminar la credencial MQTT" };
  }
}

export type EstadoMqtt = {
  estado: "conectando" | "conectado" | "error" | "desconectado";
  mensaje: string | null;
  codigo: number | null;
  desde: string | null;
  host: string | null;
  port: number | null;
  username: string | null;
  tls: boolean;
};

export async function obtenerEstadoMqtt() {
  try {
    const res = await fetchFromFastAPI("/admin/mqtt-config/estado");
    if (!res.ok) {
      return { success: false as const, error: await parseErrorText(res) };
    }
    return { success: true as const, data: (await res.json()) as EstadoMqtt };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Error al consultar el estado MQTT" };
  }
}
