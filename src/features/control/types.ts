import type { CultivoBase } from "@/services/cultivos-base";

export interface UmbralItem {
  id: number;
  nombre: string;
  min: number | string;
  max: number | string;
  unidad?: string;
  descripcion?: string;
}

export interface DispositivoItem {
  id: number;
  nombre: string;
  estado: string;
  conectado: boolean;
  funcionamientoActivo: boolean;
  tipoId?: number;
  tipoNombre?: string;
  pin_hardware?: number;
  tipo?: string;
}

export interface BombaControl {
  id?: number;
  pin: number;
  online: boolean;
  encendida: boolean;
  timeoutMin?: number;
  dispositivoConectado?: boolean;
}

export interface ValvulaControl {
  id?: number;
  pin: number;
  abierta: boolean;
  modoAuto?: boolean;
}

export interface ModoControl {
  tieneModelo: boolean;
  actual: string;
  disponible?: boolean;
  motivo?: string;
}

export interface RiegoActivoInfo {
  id: number;
  segundosTranscurridos: number;
  duracionSegundos: number;
  fechaReferencia: string;
  litrosMedidos?: number;
}

export interface ControlData {
  bomba: BombaControl;
  valvula: ValvulaControl;
  seguridad?: any;
  modo: ModoControl;
  logs?: any[];
  dispositivos?: DispositivoItem[];
  sensores?: any;
  tanque?: any;
  fuenteAgua?: any;
  esConexionDirecta?: boolean;
  actuadorTipo?: {
    metodoMedicion?: string;
  };
  riegoActivo?: RiegoActivoInfo | null;
  ultimoRiegoFechaFin?: string | null;
  cooldownMinutos?: number;
}

export interface ControlPanelProps {
  userId: number;
  cultivos: CultivoBase[];
  data: ControlData;
  idCultivo: number;
  modelosML?: any[];
  initialUmbrales?: any[];
}
