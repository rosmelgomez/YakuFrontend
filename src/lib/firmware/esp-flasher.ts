import { ESPLoader, Transport } from "esptool-js";

export type FirmwareSegment = {
  nombre: string;
  direccion: number;
  sha256: string;
  tamano: number;
};

type TerminalWriter = (message: string) => void;

export class EspFlasher {
  private port: SerialPort | null = null;
  private transport: Transport | null = null;
  private loader: ESPLoader | null = null;
  private monitorReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private monitorTask: Promise<void> | null = null;
  private monitorActive = false;

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async writeSerialLine(message: string) {
    if (!this.port?.writable) {
      throw new Error("El puerto serie no esta disponible");
    }
    const writer = this.port.writable.getWriter();
    const encoder = new TextEncoder();
    const framedMessage = `${message}\n`;
    try {
      for (let index = 0; index < framedMessage.length; index += 96) {
        await writer.write(encoder.encode(framedMessage.slice(index, index + 96)));
        await this.sleep(12);
      }
    } finally {
      writer.releaseLock();
    }
  }

  constructor(private readonly writeTerminal: TerminalWriter) {}

  static supported() {
    return typeof navigator !== "undefined" && "serial" in navigator;
  }

  private async selectPort() {
    if (!EspFlasher.supported()) throw new Error("Web Serial requiere Chrome o Edge de escritorio");
    if (!this.port) this.port = await navigator.serial.requestPort();
    return this.port;
  }

  async connect() {
    await this.stopMonitor();
    this.port = await this.selectPort();
    this.transport = new Transport(this.port, false);
    this.loader = new ESPLoader({
      transport: this.transport,
      baudrate: 460800,
      terminal: {
        clean: () => undefined,
        writeLine: (data: string) => this.writeTerminal(`${data}\n`),
        write: (data: string) => this.writeTerminal(data),
      },
      debugLogging: false,
    });
    const chip = await this.loader.main();
    const info = this.port.getInfo();
    return { chip, usbVendorId: info.usbVendorId, usbProductId: info.usbProductId };
  }

  async flash(versionId: number, segments: FirmwareSegment[], onProgress: (value: number) => void) {
    if (!this.loader) {
      this.writeTerminal("Reconectando ESP32 para iniciar instalacion...\n");
      await this.connect();
    }
    if (!this.loader) throw new Error("Conecta el ESP32 antes de instalar");

    const fileArray: Array<{ data: Uint8Array; address: number }> = [];
    for (const segment of segments) {
      const response = await fetch(
        `/api/admin/firmware/${versionId}/files/${encodeURIComponent(segment.nombre)}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const detail = payload?.detail ? `: ${payload.detail}` : "";
        throw new Error(`No se pudo descargar ${segment.nombre}${detail}`);
      }
      const data = new Uint8Array(await response.arrayBuffer());
      const digest = await crypto.subtle.digest("SHA-256", data);
      const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
      if (hash !== segment.sha256) throw new Error(`La verificacion SHA-256 fallo para ${segment.nombre}`);
      fileArray.push({ data, address: segment.direccion });
    }

    const totals = fileArray.map((item) => item.data.length);
    const completed = new Array(fileArray.length).fill(0);
    await this.loader.writeFlash({
      fileArray,
      flashMode: "dio",
      flashFreq: "40m",
      flashSize: "keep",
      // Una instalacion administrada debe comenzar sin credenciales ni
      // asignaciones NVS heredadas de otro agricultor o cultivo.
      eraseAll: true,
      compress: true,
      reportProgress: (index, written) => {
        completed[index] = written;
        const total = totals.reduce((sum, value) => sum + value, 0);
        const current = completed.reduce((sum, value) => sum + value, 0);
        onProgress(Math.min(100, Math.round((current / total) * 100)));
      },
    });
    await this.loader.after("hard_reset");
    onProgress(100);
  }

  async disconnect() {
    if (this.transport) await this.transport.disconnect();
    this.transport = null;
    this.loader = null;
  }

  async startMonitor(
    baudRate: number,
    onData: (data: string) => void,
    onClosed?: (error?: Error) => void,
  ) {
    if (this.monitorActive) return;
    if (this.transport || this.loader) await this.disconnect();

    const port = await this.selectPort();
    if (!port.readable || !port.writable) await port.open({ baudRate });
    if (!port.readable) throw new Error("El puerto serie no permite lectura");

    this.monitorActive = true;
    this.monitorReader = port.readable.getReader();
    const reader = this.monitorReader;
    const decoder = new TextDecoder();

    this.monitorTask = (async () => {
      let monitorError: Error | undefined;
      try {
        while (this.monitorActive) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value?.length) onData(decoder.decode(value, { stream: true }));
        }
        const remaining = decoder.decode();
        if (remaining) onData(remaining);
      } catch (reason) {
        if (this.monitorActive) {
          monitorError = reason instanceof Error ? reason : new Error("Se perdio la conexion serie");
        }
      } finally {
        this.monitorActive = false;
        if (this.monitorReader === reader) this.monitorReader = null;
        reader.releaseLock();
        onClosed?.(monitorError);
      }
    })();
  }

  async stopMonitor() {
    if (!this.monitorActive && !this.monitorTask) return;
    this.monitorActive = false;
    await this.monitorReader?.cancel().catch(() => undefined);
    await this.monitorTask?.catch(() => undefined);
    this.monitorTask = null;
    if (this.port?.readable || this.port?.writable) {
      await this.port.close().catch(() => undefined);
    }
  }

  async writeSerial(message: string) {
    if (!this.monitorActive || !this.port?.writable) {
      throw new Error("Abre el monitor serie antes de enviar comandos");
    }
    await this.writeSerialLine(message);
  }

  async sendProvisioning(configuration: object) {
    const port = await this.selectPort();
    const payload = JSON.stringify(configuration);
    this.writeTerminal(`Enviando configuracion (${payload.length} bytes)...\n`);
    if (this.monitorActive) {
      await this.writeSerial(payload);
      return;
    }
    if (!port.writable) {
      await port.open({ baudRate: 115200 });
      await this.sleep(1600);
    }
    try {
      await this.writeSerialLine(payload);
    } finally {
      await port.close();
    }
  }
}
