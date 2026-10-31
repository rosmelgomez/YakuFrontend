type FirmwareDevice = {
  metodo_medicion?: string;
  tipo?: { nombre?: string };
};

// Keep the same precedence as firmware_type_for_device in the backend.
export function firmwareTypeForDevice(device?: FirmwareDevice) {
  if (device?.metodo_medicion === "flujometro") return "riego_flujo";
  if (device?.metodo_medicion === "proximidad") return "riego";
  const name = (device?.tipo?.nombre ?? "").toLowerCase();
  if (name.includes("fluj")) return "riego_flujo";
  if (/actuador|proximidad|tanque|nivel|riego/.test(name)) return "riego";
  if (/s3|colector|sensor/.test(name)) return "sensores";
  return "";
}

export const FIRMWARE_CHIPS = ["ESP32", "ESP32-S3"] as const;

// Keep the same rules as chip_family in the backend. esptool reports e.g.
// "ESP32-S3 (QFN56) (revision v0.2)" or "ESP32-D0WD-V3 (revision v3.1)": both
// contain "ESP32", so a substring check would accept ESP32 firmware on an S3.
export function chipFamily(chip?: string) {
  const text = (chip ?? "").trim().toUpperCase();
  if (text.startsWith("ESP32-S3")) return "ESP32-S3";
  if (text.startsWith("ESP32") && !/^ESP32-[SCHP]\d/.test(text)) return "ESP32";
  return text;
}
