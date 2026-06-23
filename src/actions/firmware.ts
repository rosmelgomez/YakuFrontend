"use server";

import { revalidatePath } from "next/cache";
import { fetchFromFastAPI } from "@/lib/bff";

async function jsonOrThrow(res: Response, fallback: string) {
  if (!res.ok) throw new Error((await res.text()) || fallback);
  return res.json();
}

export async function listarVersionesFirmware() {
  return jsonOrThrow(await fetchFromFastAPI("/firmware/versions"), "Error al listar firmware");
}

export async function listarInstalacionesFirmware() {
  return jsonOrThrow(await fetchFromFastAPI("/firmware/installations"), "Error al listar instalaciones");
}

export async function obtenerProvisionamientoFirmware(deviceId: number) {
  return jsonOrThrow(
    await fetchFromFastAPI(`/firmware/devices/${deviceId}/provisioning`, { method: "POST" }),
    "No se pudo generar la configuracion del dispositivo",
  );
}

export async function iniciarInstalacionFirmware(payload: {
  id_firmware: number;
  id_dispositivo: number;
  chip_detectado?: string;
  mac_detectada?: string;
}) {
  return jsonOrThrow(
    await fetchFromFastAPI("/firmware/installations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
    "No se pudo iniciar la instalacion",
  );
}

export async function actualizarInstalacionFirmware(
  installationId: number,
  payload: { estado: string; progreso: number; mensaje?: string },
) {
  const result = await jsonOrThrow(
    await fetchFromFastAPI(`/firmware/installations/${installationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
    "No se pudo actualizar la instalacion",
  );
  revalidatePath("/dashboard/administrador/firmware");
  return result;
}
