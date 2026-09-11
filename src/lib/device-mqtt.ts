type DeviceType = {
  id: string | number;
  nombre?: string;
  metodo_medicion?: string | null;
};

export function deviceMqttTopics(type: DeviceType | undefined, clientId: string) {
  if (!type) return { publish: "", subscribe: "" };
  const name = (type.nombre ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  // Los catálogos anteriores incluyen el nombre, pero no metodo_medicion.
  const actuator = type.metodo_medicion === "proximidad" ||
    type.metodo_medicion === "flujometro" || String(type.id) === "2" ||
    /actuador|fluj[oi]metro|proximidad|tanque|nivel/.test(name);
  if (actuator) {
    return {
      publish: "yaku/tanque/datos",
      subscribe: clientId ? `yaku/dispositivo/${clientId}/comando` : "",
    };
  }
  if (String(type.id) === "1" || /colector|captura|sensores/.test(name)) {
    return { publish: "yaku/riego/datos", subscribe: "yaku/valvula/comando" };
  }
  return { publish: "", subscribe: "" };
}
