// src/types/index.ts
export * from './auth.types';

export type UserRole = "farmer" | "admin" | "agricultor" | "administrador";

export type Screen =
  // Auth
  | "login"
  | "register"
  | "verify-email"
  | "reset-password"
  // Farmer / Agricultor
  | "farmer-dashboard"
  | "farmer-crops"
  | "farmer-sensors"
  | "farmer-water"
  | "farmer-irrigation"
  | "farmer-historical"
  | "farmer-alerts"
  | "farmer-predictive"
  | "farmer-feedback"
  | "farmer-profile"
  // Admin / Administrador
  | "admin-dashboard"
  | "admin-users"
  | "admin-devices"
  | "admin-components"
  | "admin-firmware"
  | "admin-catalogs"
  | "admin-feedback-questions"
  | "admin-warehouses"
  | "admin-backup";

export interface AppState {
  screen: Screen;
  role: UserRole;
  navigate: (screen: Screen) => void;
}

export type SensorStatus = "online" | "offline" | "warning";
export type IrrigationStatus = "inactive" | "active" | "paused" | "finished" | "failed";
export type DeviceStatus = "connected" | "disconnected" | "enabled" | "disabled";
export type WaterSourceType = "tank" | "direct";

export interface Sensor {
  id: string;
  name: string;
  type: "humidity" | "temperature" | "ph" | "ec" | "pressure" | "flow";
  value: number;
  unit: string;
  status: SensorStatus;
  lastReading: string;
  battery?: number;
  location: string;
}

export interface Crop {
  id: string;
  name: string;
  variety: string;
  area: number;
  plantedAt: string;
  stage: string;
  healthScore: number;
  irrigationZone: string;
  sensors: string[];
}

export interface Device {
  id: string;
  serialNumber: string;
  model: string;
  firmwareVersion: string;
  status: DeviceStatus;
  lastSeen: string;
  assignedTo?: string;
  location: string;
}

export interface Alert {
  id: string;
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  source: string;
}

export interface IrrigationSession {
  id: string;
  zone: string;
  status: IrrigationStatus;
  startedAt?: string;
  finishedAt?: string;
  duration?: number;
  waterUsed?: number;
  triggeredBy: "manual" | "schedule" | "ai";
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "inactive" | "pending";
  createdAt: string;
  lastLogin?: string;
  farm?: string;
}
