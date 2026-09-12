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
