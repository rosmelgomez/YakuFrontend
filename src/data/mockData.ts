import type { Sensor, Crop, Device, Alert, IrrigationSession, User } from "../types";

export const mockSensors: Sensor[] = [
  { id: "s1", name: "Humedad Suelo - Zona A", type: "humidity", value: 62, unit: "%", status: "online", lastReading: "hace 2 min", battery: 87, location: "Parcela Norte" },
  { id: "s2", name: "Temperatura - Zona A", type: "temperature", value: 24.3, unit: "°C", status: "online", lastReading: "hace 2 min", battery: 87, location: "Parcela Norte" },
  { id: "s3", name: "pH Suelo - Zona B", type: "ph", value: 6.8, unit: "pH", status: "online", lastReading: "hace 5 min", battery: 64, location: "Parcela Sur" },
  { id: "s4", name: "CE Suelo - Zona B", type: "ec", value: 1.42, unit: "mS/cm", status: "warning", lastReading: "hace 12 min", battery: 31, location: "Parcela Sur" },
  { id: "s5", name: "Presión Red - Principal", type: "pressure", value: 2.8, unit: "bar", status: "online", lastReading: "hace 1 min", battery: 95, location: "Cabezal" },
  { id: "s6", name: "Caudal - Zona C", type: "flow", value: 0, unit: "L/min", status: "offline", lastReading: "hace 3 h", battery: 12, location: "Parcela Este" },
];

export const mockCrops: Crop[] = [
  { id: "c1", name: "Tomate Cherry", variety: "Favorita F1", area: 2.4, plantedAt: "2026-06-15", stage: "Fructificación", healthScore: 88, irrigationZone: "Zona A", sensors: ["s1", "s2"] },
  { id: "c2", name: "Pimiento Rojo", variety: "Lamuyo", area: 1.8, plantedAt: "2026-06-20", stage: "Floración", healthScore: 74, irrigationZone: "Zona B", sensors: ["s3", "s4"] },
  { id: "c3", name: "Lechuga Romana", variety: "Parris Island", area: 0.9, plantedAt: "2026-08-01", stage: "Crecimiento", healthScore: 92, irrigationZone: "Zona C", sensors: ["s6"] },
  { id: "c4", name: "Calabacín", variety: "Amalthée F1", area: 1.2, plantedAt: "2026-07-10", stage: "Maduración", healthScore: 81, irrigationZone: "Zona A", sensors: ["s1"] },
];

export const mockDevices: Device[] = [
  { id: "d1", serialNumber: "YKU-2024-001", model: "Yaku Node v2", firmwareVersion: "2.4.1", status: "connected", lastSeen: "2026-09-13T10:42:00", assignedTo: "Finca Las Eras", location: "Parcela Norte" },
  { id: "d2", serialNumber: "YKU-2024-002", model: "Yaku Node v2", firmwareVersion: "2.4.1", status: "connected", lastSeen: "2026-09-13T10:41:30", assignedTo: "Finca Las Eras", location: "Parcela Sur" },
  { id: "d3", serialNumber: "YKU-2023-089", model: "Yaku Node v1", firmwareVersion: "1.9.3", status: "disabled", lastSeen: "2026-09-10T08:15:00", assignedTo: "Finca Las Eras", location: "Parcela Este" },
  { id: "d4", serialNumber: "YKU-2024-045", model: "Yaku Hub v1", firmwareVersion: "2.4.1", status: "connected", lastSeen: "2026-09-13T10:43:00", assignedTo: "Finca El Prado", location: "Cabezal" },
  { id: "d5", serialNumber: "YKU-2024-067", model: "Yaku Node v2", firmwareVersion: "2.3.0", status: "disconnected", lastSeen: "2026-09-12T14:22:00", assignedTo: undefined, location: "Almacén Central" },
];

export const mockAlerts: Alert[] = [
  { id: "a1", type: "warning", title: "Batería baja en sensor", message: "El sensor CE Suelo - Zona B tiene un 31% de batería. Considere reemplazarla pronto.", createdAt: "2026-09-13T09:15:00", read: false, source: "Sensor s4" },
  { id: "a2", type: "error", title: "Sensor desconectado", message: "El sensor Caudal - Zona C lleva más de 3 horas sin transmitir datos. Verifique la conexión.", createdAt: "2026-09-13T07:30:00", read: false, source: "Sensor s6" },
  { id: "a3", type: "info", title: "Riego completado", message: "La sesión de riego en Zona A finalizó correctamente. Se utilizaron 340 L en 45 min.", createdAt: "2026-09-13T06:45:00", read: true, source: "Sistema de riego" },
  { id: "a4", type: "warning", title: "Humedad por debajo del umbral", message: "La humedad en Parcela Sur (58%) está por debajo del umbral mínimo definido (65%).", createdAt: "2026-09-12T18:20:00", read: true, source: "Sensor s3" },
  { id: "a5", type: "success", title: "Firmware actualizado", message: "El dispositivo YKU-2024-001 se actualizó correctamente a la versión 2.4.1.", createdAt: "2026-09-11T11:00:00", read: true, source: "Sistema" },
];

export const mockIrrigationSessions: IrrigationSession[] = [
  { id: "ir1", zone: "Zona A", status: "active", startedAt: "2026-09-13T10:00:00", duration: 43, waterUsed: 280, triggeredBy: "schedule" },
  { id: "ir2", zone: "Zona B", status: "inactive", triggeredBy: "manual" },
  { id: "ir3", zone: "Zona C", status: "failed", startedAt: "2026-09-13T08:00:00", finishedAt: "2026-09-13T08:04:00", triggeredBy: "ai" },
];

export const mockUsers: User[] = [
  { id: "u1", name: "Carlos Mendoza", email: "carlos@fincalaeras.com", role: "farmer", status: "active", createdAt: "2026-01-15", lastLogin: "2026-09-13T10:30:00", farm: "Finca Las Eras" },
  { id: "u2", name: "Elena Ruiz", email: "elena@fincaelprado.com", role: "farmer", status: "active", createdAt: "2026-02-20", lastLogin: "2026-09-12T16:45:00", farm: "Finca El Prado" },
  { id: "u3", name: "Miguel Torres", email: "miguel@finca3.com", role: "farmer", status: "inactive", createdAt: "2026-03-01", lastLogin: "2026-08-30T09:00:00", farm: "Finca Los Olivos" },
  { id: "u4", name: "Ana García", email: "ana@yakutech.com", role: "admin", status: "active", createdAt: "2025-12-01", lastLogin: "2026-09-13T09:00:00" },
  { id: "u5", name: "Lucía Pérez", email: "lucia@finca5.com", role: "farmer", status: "pending", createdAt: "2026-09-10", farm: "Finca Nueva" },
];

export const sensorHistoryData = [
  { time: "00:00", humidity: 72, temperature: 19.2, ph: 6.9 },
  { time: "02:00", humidity: 71, temperature: 18.8, ph: 6.9 },
  { time: "04:00", humidity: 68, temperature: 18.1, ph: 6.8 },
  { time: "06:00", humidity: 65, temperature: 17.9, ph: 6.8 },
  { time: "08:00", humidity: 63, temperature: 20.4, ph: 6.8 },
  { time: "10:00", humidity: 62, temperature: 24.3, ph: 6.8 },
  { time: "12:00", humidity: 58, temperature: 27.1, ph: 6.7 },
  { time: "14:00", humidity: 55, temperature: 28.4, ph: 6.7 },
  { time: "16:00", humidity: 57, temperature: 26.9, ph: 6.7 },
  { time: "18:00", humidity: 61, temperature: 24.2, ph: 6.8 },
  { time: "20:00", humidity: 64, temperature: 22.1, ph: 6.8 },
  { time: "22:00", humidity: 67, temperature: 20.6, ph: 6.9 },
];

export const waterUsageData = [
  { day: "Lun", liters: 420 },
  { day: "Mar", liters: 380 },
  { day: "Mié", liters: 510 },
  { day: "Jue", liters: 340 },
  { day: "Vie", liters: 480 },
  { day: "Sáb", liters: 290 },
  { day: "Dom", liters: 320 },
];

export const predictiveData = [
  { day: "Hoy", actual: 62, predicted: 60, optimal: 70 },
  { day: "Mañ", actual: null, predicted: 58, optimal: 70 },
  { day: "+2d", actual: null, predicted: 54, optimal: 70 },
  { day: "+3d", actual: null, predicted: 51, optimal: 70 },
  { day: "+4d", actual: null, predicted: 65, optimal: 70 },
  { day: "+5d", actual: null, predicted: 68, optimal: 70 },
  { day: "+6d", actual: null, predicted: 70, optimal: 70 },
];
