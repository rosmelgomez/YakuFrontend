"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Cable, CheckCircle2, Cpu, FileArchive, History, LoaderCircle, Plus,
  Eye, EyeOff, Pause, Play, RefreshCw, Send, TerminalSquare, Trash2, Upload, Usb, Wifi, X,
} from "lucide-react";
import {
  actualizarInstalacionFirmware,
  descontinuarVersionFirmware,
  iniciarInstalacionFirmware,
  obtenerProvisionamientoFirmware,
} from "@/actions/firmware";
import { EspFlasher, FirmwareSegment } from "@/lib/firmware/esp-flasher";
import styles from "./FirmwareClient.module.css";

type FirmwareVersion = {
  id: number;
  version: string;
  chip: string;
  tipo_dispositivo: string;
  descripcion?: string;
  publicado: boolean;
  fecha_registro: string;
  manifiesto: { segmentos: FirmwareSegment[] };
  archivos_faltantes?: string[];
};

type Installation = {
  id: number;
  id_firmware: number;
  id_dispositivo: number;
  chip_detectado?: string;
  estado: string;
  progreso: number;
  mensaje?: string;
  fecha_inicio: string;
};

type Device = {
  id?: number;
  id_dispositivo?: number;
  nombre: string;
  estado?: string;
  firmware_version?: string;
  mac_address?: string;
  tipo?: { nombre?: string };
  asignaciones_iot?: Array<{
    id_usuario: number;
    id_cultivo?: number | null;
    activo: boolean;
  }>;
};

type User = {
  id: number;
  nombre: string;
  apellido?: string;
  correo: string;
  id_rol?: number;
  estado: boolean;
};

type Crop = {
  id?: number;
  id_cultivo?: number;
  id_usuario: number;
  nombre_planta: string;
  estado: string;
};

type Provisioning = {
  device_uid: string;
  agricultor: string;
  cultivo: string;
  id_usuario: number;
  id_cultivo: number;
  asignaciones: Record<string, number>;
  captura_segundos: number;
  cooldown_riego_minutos: number;
  mqtt: Record<string, unknown>;
};

type UploadSegment = { file: File; address: string };
type Tab = "install" | "versions" | "history";

const defaultAddress = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes("partition")) return "0x8000";
  if (lower.includes("boot_app0")) return "0xe000";
  if (lower.includes("bootloader")) return "0x0";
  return "0x10000";
};

const firmwareTypeForDevice = (device?: Device) => {
  const typeName = `${device?.tipo?.nombre ?? ""} ${device?.nombre ?? ""}`.toLowerCase();
  if (typeName.includes("s3") || typeName.includes("colector") || typeName.includes("sensor")) return "sensores";
  if (typeName.includes("actuador") || typeName.includes("nivel") || typeName.includes("riego")) return "riego";
  return "";
};

export default function FirmwareClient({
  initialVersions,
  initialInstallations,
  devices,
  users,
  crops,
  loadErrors,
}: {
  initialVersions: FirmwareVersion[];
  initialInstallations: Installation[];
  devices: Device[];
  users: User[];
  crops: Crop[];
  loadErrors: string[];
}) {
  const router = useRouter();
  const flasherRef = useRef<EspFlasher | null>(null);
  const monitorPausedRef = useRef(false);
  const terminalRef = useRef<HTMLPreElement | null>(null);
  const [tab, setTab] = useState<Tab>("install");
  const [versionId, setVersionId] = useState("");
  const [userId, setUserId] = useState("");
  const [cropId, setCropId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [chip, setChip] = useState("");
  const [usbInfo, setUsbInfo] = useState("");
  const [provisioning, setProvisioning] = useState<Provisioning | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Conecta un dispositivo para comenzar.");
  const [error, setError] = useState("");
  const [terminal, setTerminal] = useState<string[]>([]);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [monitorPaused, setMonitorPaused] = useState(false);
  const [baudRate, setBaudRate] = useState("115200");
  const [serialCommand, setSerialCommand] = useState("");
  const [ssid, setSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const [mqttUser, setMqttUser] = useState("");
  const [mqttPassword, setMqttPassword] = useState("");
  const [showMqttPassword, setShowMqttPassword] = useState(false);
  const [uploadSegments, setUploadSegments] = useState<UploadSegment[]>([]);
  const [uploading, setUploading] = useState(false);

  const selectedVersion = useMemo(
    () => initialVersions.find((item) => item.id === Number(versionId)),
    [initialVersions, versionId],
  );
  const farmers = useMemo(
    () => users.filter((user) => user.estado && user.id_rol === 2),
    [users],
  );
  const filteredCrops = useMemo(
    () => crops.filter((crop) => crop.id_usuario === Number(userId) && crop.estado === "activo"),
    [crops, userId],
  );
  const filteredDevices = useMemo(
    () => devices.filter((device) => device.asignaciones_iot?.some((assignment) => (
      assignment.id_usuario === Number(userId)
      && assignment.id_cultivo === Number(cropId)
    ))),
    [devices, userId, cropId],
  );
  const selectedDevice = useMemo(
    () => devices.find((item) => (item.id_dispositivo ?? item.id) === Number(deviceId)),
    [devices, deviceId],
  );
  const selectedDeviceFirmwareType = firmwareTypeForDevice(selectedDevice);
  const publishedVersions = useMemo(
    () => initialVersions.filter((item) => (
      item.publicado
      && (!selectedDeviceFirmwareType || item.tipo_dispositivo === selectedDeviceFirmwareType)
    )),
    [initialVersions, selectedDeviceFirmwareType],
  );
  const chipCompatible = !chip || !selectedVersion || chip.toUpperCase().includes(selectedVersion.chip.toUpperCase());
  const selectedVersionMissingFiles = selectedVersion?.archivos_faltantes ?? [];

  const appendTerminal = (line: string) => {
    if (!line || monitorPausedRef.current) return;
    setTerminal((current) => [...current.slice(-399), line]);
  };

  useEffect(() => () => {
    void flasherRef.current?.stopMonitor();
  }, []);

  useEffect(() => {
    const terminalElement = terminalRef.current;
    if (!terminalElement || monitorPausedRef.current) return;
    terminalElement.scrollTop = terminalElement.scrollHeight;
  }, [terminal]);

  useEffect(() => {
    if (versionId && !publishedVersions.some((item) => item.id === Number(versionId))) {
      setVersionId("");
    }
  }, [publishedVersions, versionId]);

  async function toggleMonitor() {
    setError("");
    try {
      const flasher = flasherRef.current ?? new EspFlasher(appendTerminal);
      flasherRef.current = flasher;
      if (monitorOpen) {
        await flasher.stopMonitor();
        setMonitorOpen(false);
        setStatus("Monitor serie cerrado.");
        return;
      }
      await flasher.startMonitor(Number(baudRate), appendTerminal, (reason) => {
        setMonitorOpen(false);
        if (reason) setError(reason.message);
      });
      setMonitorOpen(true);
      setStatus(`Monitor serie abierto a ${baudRate} baudios.`);
    } catch (reason) {
      setMonitorOpen(false);
      setError(reason instanceof Error ? reason.message : "No se pudo abrir el monitor serie");
    }
  }

  function toggleMonitorPause() {
    const next = !monitorPaused;
    monitorPausedRef.current = next;
    setMonitorPaused(next);
  }

  async function sendSerialCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const command = serialCommand.trim();
    if (!command || !flasherRef.current) return;
    try {
      await flasherRef.current.writeSerial(command);
      setTerminal((current) => [...current.slice(-399), `> ${command}`]);
      setSerialCommand("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo enviar el comando");
    }
  }

  async function selectDevice(value: string) {
    setDeviceId(value);
    setProvisioning(null);
    setError("");
    if (!value) return;
    try {
      setProvisioning(await obtenerProvisionamientoFirmware(Number(value)));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "El dispositivo no esta listo para aprovisionar");
    }
  }

  function selectUser(value: string) {
    setUserId(value);
    setCropId("");
    setDeviceId("");
    setProvisioning(null);
    setError("");
  }

  function selectCrop(value: string) {
    setCropId(value);
    setDeviceId("");
    setProvisioning(null);
    setError("");
  }

  async function connectDevice() {
    setBusy(true);
    setError("");
    try {
      if (monitorOpen) {
        await flasherRef.current?.stopMonitor();
        setMonitorOpen(false);
      }
      const flasher = new EspFlasher(appendTerminal);
      flasherRef.current = flasher;
      const detected = await flasher.connect();
      setChip(detected.chip);
      setUsbInfo(
        [detected.usbVendorId && `VID ${detected.usbVendorId.toString(16).toUpperCase()}`,
          detected.usbProductId && `PID ${detected.usbProductId.toString(16).toUpperCase()}`]
          .filter(Boolean).join(" · "),
      );
      setStatus(`Dispositivo detectado: ${detected.chip}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo conectar el dispositivo");
    } finally {
      setBusy(false);
    }
  }

  async function installFirmware() {
    if (!selectedVersion || !selectedDevice || !flasherRef.current || !chipCompatible) return;
    setBusy(true);
    setError("");
    setProgress(0);
    let installationId: number | null = null;
    try {
      const installation = await iniciarInstalacionFirmware({
        id_firmware: selectedVersion.id,
        id_dispositivo: selectedDevice.id_dispositivo ?? selectedDevice.id!,
        chip_detectado: chip,
      });
      const currentInstallationId = Number(installation.id);
      installationId = currentInstallationId;
      setStatus("Descargando y verificando segmentos...");
      await actualizarInstalacionFirmware(currentInstallationId, { estado: "instalando", progreso: 0 });
      await flasherRef.current.flash(selectedVersion.id, selectedVersion.manifiesto.segmentos, (value) => {
        setProgress(value);
        setStatus(`Instalando firmware ${selectedVersion.version}: ${value}%`);
      });
      await flasherRef.current.disconnect();
      await actualizarInstalacionFirmware(currentInstallationId, {
        estado: "completada",
        progreso: 100,
        mensaje: "Firmware verificado e instalado",
      });
      setStatus("Instalacion completada y configuracion anterior borrada. Envia ahora la configuracion de campo.");
      router.refresh();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "La instalacion fallo";
      setError(message);
      if (installationId) {
        await actualizarInstalacionFirmware(installationId, {
          estado: "error", progreso: progress, mensaje: message,
        }).catch(() => undefined);
      }
    } finally {
      setBusy(false);
    }
  }

  async function sendProvisioning() {
    if (!provisioning || !flasherRef.current) return;
    setBusy(true);
    setError("");
    try {
      await flasherRef.current.sendProvisioning({
        schema_version: 1,
        device_uid: provisioning.device_uid,
        asignaciones: provisioning.asignaciones,
        captura_segundos: provisioning.captura_segundos,
        cooldown_riego_minutos: provisioning.cooldown_riego_minutos,
        wifi: { ssid, password: wifiPassword },
        mqtt: {
          host: provisioning.mqtt.host,
          port: provisioning.mqtt.port,
          username: mqttUser,
          password: mqttPassword,
          topic_pub: provisioning.mqtt.topic_pub,
          topic_sub: provisioning.mqtt.topic_sub,
          tls: provisioning.mqtt.tls,
        },
      });
      setStatus("Configuracion enviada al dispositivo.");
      setWifiPassword("");
      setMqttPassword("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo enviar la configuracion");
    } finally {
      setBusy(false);
    }
  }

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    setUploadSegments(files.map((file) => ({ file, address: defaultAddress(file.name) })));
  }

  async function uploadVersion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (!uploadSegments.length) return setError("Selecciona al menos un archivo .bin");
    setUploading(true);
    setError("");
    try {
      const metadata = {
        version: data.get("version"),
        chip: data.get("chip"),
        tipo_dispositivo: data.get("tipo_dispositivo"),
        descripcion: data.get("descripcion"),
        publicado: true,
        segmentos: uploadSegments.map((item) => ({ nombre: item.file.name, direccion: item.address })),
      };
      const body = new FormData();
      body.set("metadata", JSON.stringify(metadata));
      uploadSegments.forEach((item) => body.append("files", item.file));
      const response = await fetch("/api/admin/firmware", { method: "POST", body });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || "No se pudo publicar la version");
      }
      setStatus("Version publicada correctamente.");
      setUploadSegments([]);
      form.reset();
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo publicar la version");
    } finally {
      setUploading(false);
    }
  }

  async function handleDiscontinue(id: number, versionStr: string) {
    if (!confirm(`¿Está seguro de que desea descontinuar la versión v${versionStr}? Esta acción ocultará la versión y la marcará como descontinuada.`)) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await descontinuarVersionFirmware(id);
      setStatus(`Versión v${versionStr} descontinuada correctamente.`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo descontinuar la versión");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestor de firmware</h1>
          <p className={styles.subtitle}>ESP32 de sensores y control de riego</p>
        </div>
        <div className={styles.tabs} role="tablist" aria-label="Vistas del gestor">
          <button className={`${styles.tab} ${tab === "install" ? styles.tabActive : ""}`} onClick={() => setTab("install")}><Usb size={15} /> Instalar</button>
          <button className={`${styles.tab} ${tab === "versions" ? styles.tabActive : ""}`} onClick={() => setTab("versions")}><FileArchive size={15} /> Versiones</button>
          <button className={`${styles.tab} ${tab === "history" ? styles.tabActive : ""}`} onClick={() => setTab("history")}><History size={15} /> Historial</button>
        </div>
      </header>

      {(error || status) && (
        <div className={`${styles.status} ${error ? styles.statusError : ""}`} style={{ marginBottom: 16 }}>
          {error ? <Cable size={17} /> : <CheckCircle2 size={17} />}
          <span>{error || status}</span>
        </div>
      )}

      {loadErrors.length > 0 && (
        <div className={`${styles.status} ${styles.statusError}`} style={{ marginBottom: 16 }}>
          <Cable size={17} />
          <span>No se pudo cargar toda la informacion: {Array.from(new Set(loadErrors)).join(" ")}</span>
        </div>
      )}

      {tab === "install" && (
        <div className={styles.grid}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}><h2 className={styles.panelTitle}>Instalacion USB</h2><Cpu size={18} color="#38bdf8" /></div>
            <div className={styles.panelBody}>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span className={styles.label}>Agricultor</span>
                  <select className={styles.select} value={userId} onChange={(event) => selectUser(event.target.value)}>
                    <option value="">Seleccionar agricultor</option>
                    {farmers.map((user) => <option key={user.id} value={user.id}>{user.nombre} {user.apellido || ""} · {user.correo}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Cultivo</span>
                  <select className={styles.select} value={cropId} onChange={(event) => selectCrop(event.target.value)} disabled={!userId}>
                    <option value="">{userId ? "Seleccionar cultivo" : "Selecciona primero un agricultor"}</option>
                    {filteredCrops.map((crop) => {
                      const id = crop.id_cultivo ?? crop.id;
                      return <option key={id} value={id}>{crop.nombre_planta}</option>;
                    })}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Dispositivo registrado</span>
                  <select className={styles.select} value={deviceId} onChange={(event) => selectDevice(event.target.value)} disabled={!cropId}>
                    <option value="">{cropId ? "Seleccionar dispositivo" : "Selecciona primero un cultivo"}</option>
                    {filteredDevices.map((device) => {
                      const id = device.id_dispositivo ?? device.id;
                      return <option key={id} value={id}>{device.nombre} {device.mac_address ? `· ${device.mac_address}` : ""}</option>;
                    })}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Version aprobada</span>
                  <select className={styles.select} value={versionId} onChange={(event) => setVersionId(event.target.value)}>
                    <option value="">{publishedVersions.length ? "Seleccionar firmware" : "No hay firmware publicado"}</option>
                    {publishedVersions.map((item) => (
                      <option key={item.id} value={item.id}>{item.chip} · {item.tipo_dispositivo} · v{item.version}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={styles.actions}>
                <button className={styles.button} onClick={connectDevice} disabled={busy}>
                  {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Usb size={16} />} Conectar
                </button>
                <button className={`${styles.button} ${styles.primary}`} onClick={installFirmware} disabled={busy || !chip || !selectedVersion || !selectedDevice || !chipCompatible || selectedVersionMissingFiles.length > 0}>
                  <Upload size={16} /> Instalar firmware
                </button>
              </div>
              {chip && !chipCompatible && <div className={`${styles.status} ${styles.statusError}`} style={{ marginTop: 14 }}>El chip {chip} no es compatible con {selectedVersion?.chip}.</div>}
              {selectedVersionMissingFiles.length > 0 && (
                <div className={`${styles.status} ${styles.statusError}`} style={{ marginTop: 14 }}>
                  Faltan archivos en el backend: {selectedVersionMissingFiles.join(", ")}
                </div>
              )}
              <div className={styles.progressTrack}><div className={styles.progressBar} style={{ width: `${progress}%` }} /></div>
            </div>

            <div className={styles.panelHeader}><h2 className={styles.panelTitle}>Configuracion de campo</h2><Wifi size={18} color="#22c55e" /></div>
            <div className={styles.panelBody}>
              <div className={styles.formGrid}>
                <label className={styles.field}><span className={styles.label}>WiFi SSID</span><input className={styles.input} value={ssid} onChange={(e) => setSsid(e.target.value)} /></label>
                <label className={styles.field}>
                  <span className={styles.label}>Clave WiFi</span>
                  <span className={styles.secretField}>
                    <input type={showWifiPassword ? "text" : "password"} className={`${styles.input} ${styles.secretInput}`} value={wifiPassword} onChange={(e) => setWifiPassword(e.target.value)} />
                    <button
                      type="button"
                      className={styles.secretToggle}
                      onClick={() => setShowWifiPassword((current) => !current)}
                      aria-label={showWifiPassword ? "Ocultar clave WiFi" : "Ver clave WiFi"}
                      title={showWifiPassword ? "Ocultar clave WiFi" : "Ver clave WiFi"}
                    >
                      {showWifiPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </span>
                </label>
                <label className={styles.field}><span className={styles.label}>Usuario MQTT</span><input className={styles.input} value={mqttUser} onChange={(e) => setMqttUser(e.target.value)} /></label>
                <label className={styles.field}>
                  <span className={styles.label}>Clave MQTT</span>
                  <span className={styles.secretField}>
                    <input type={showMqttPassword ? "text" : "password"} className={`${styles.input} ${styles.secretInput}`} value={mqttPassword} onChange={(e) => setMqttPassword(e.target.value)} />
                    <button
                      type="button"
                      className={styles.secretToggle}
                      onClick={() => setShowMqttPassword((current) => !current)}
                      aria-label={showMqttPassword ? "Ocultar clave MQTT" : "Ver clave MQTT"}
                      title={showMqttPassword ? "Ocultar clave MQTT" : "Ver clave MQTT"}
                    >
                      {showMqttPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </span>
                </label>
              </div>
              <div className={styles.actions}>
                <button className={styles.button} onClick={sendProvisioning} disabled={busy || !provisioning || !ssid || !wifiPassword || !mqttUser || !mqttPassword}><Cable size={16} /> Enviar configuracion</button>
              </div>
            </div>
          </section>

          <aside style={{ display: "grid", alignContent: "start", gap: 16 }}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}><h2 className={styles.panelTitle}>Dispositivo y asignacion</h2><RefreshCw size={16} /></div>
              <div className={styles.panelBody}>
                <dl className={styles.kv}>
                  <dt>USB</dt><dd>{usbInfo || "Sin conectar"}</dd>
                  <dt>Chip</dt><dd>{chip || "No detectado"}</dd>
                  <dt>Equipo</dt><dd>{selectedDevice?.nombre || "No seleccionado"}</dd>
                  <dt>Identidad</dt><dd>{provisioning?.device_uid || "Pendiente"}</dd>
                  <dt>Agricultor</dt><dd>{provisioning?.agricultor || "Pendiente"}</dd>
                  <dt>Cultivo</dt><dd>{provisioning?.cultivo || "Pendiente"}</dd>
                </dl>
                {provisioning && <div className={styles.metricList}>{Object.entries(provisioning.asignaciones).map(([code, id]) => <span className={styles.metric} key={code}>{code}: {id}</span>)}</div>}
              </div>
            </section>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Monitor serie</h2>
                <span className={`${styles.serialState} ${monitorOpen ? styles.serialStateOpen : ""}`}>{monitorOpen ? "Conectado" : "Cerrado"}</span>
              </div>
              <div className={styles.monitorToolbar}>
                <select className={styles.baudSelect} value={baudRate} onChange={(event) => setBaudRate(event.target.value)} disabled={monitorOpen} aria-label="Velocidad en baudios">
                  {[9600, 19200, 38400, 57600, 115200, 230400].map((rate) => <option key={rate} value={rate}>{rate} baud</option>)}
                </select>
                <button className={styles.iconButton} onClick={toggleMonitor} disabled={busy} title={monitorOpen ? "Cerrar monitor" : "Abrir monitor"} aria-label={monitorOpen ? "Cerrar monitor" : "Abrir monitor"}>{monitorOpen ? <X size={16} /> : <TerminalSquare size={16} />}</button>
                <button className={styles.iconButton} onClick={toggleMonitorPause} disabled={!monitorOpen} title={monitorPaused ? "Reanudar salida" : "Pausar salida"} aria-label={monitorPaused ? "Reanudar salida" : "Pausar salida"}>{monitorPaused ? <Play size={16} /> : <Pause size={16} />}</button>
                <button className={styles.iconButton} onClick={() => setTerminal([])} title="Limpiar monitor" aria-label="Limpiar monitor"><Trash2 size={16} /></button>
              </div>
              <pre ref={terminalRef} className={styles.terminal}>{terminal.length ? terminal.join("") : "Esperando conexion serie...\n"}</pre>
              <form className={styles.serialCommand} onSubmit={sendSerialCommand}>
                <input className={styles.input} value={serialCommand} onChange={(event) => setSerialCommand(event.target.value)} placeholder="Enviar comando" disabled={!monitorOpen} aria-label="Comando serie" />
                <button className={styles.iconButton} type="submit" disabled={!monitorOpen || !serialCommand.trim()} title="Enviar comando" aria-label="Enviar comando"><Send size={16} /></button>
              </form>
            </section>
          </aside>
        </div>
      )}

      {tab === "versions" && (
        <div className={styles.grid}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}><h2 className={styles.panelTitle}>Versiones publicadas</h2><span className={styles.badge}>{initialVersions.length}</span></div>
            <div className={styles.tableWrap}>
              {initialVersions.length ? <table className={styles.table}><thead><tr><th>Version</th><th>Chip</th><th>Funcion</th><th>Segmentos</th><th>Estado</th><th style={{ textAlign: "right" }}>Acciones</th></tr></thead><tbody>
                {initialVersions.map((item) => (
                  <tr key={item.id}>
                    <td>v{item.version}</td>
                    <td>{item.chip}</td>
                    <td>{item.tipo_dispositivo}</td>
                    <td>{item.archivos_faltantes?.length ? `${item.manifiesto.segmentos.length} (${item.archivos_faltantes.length} faltan)` : item.manifiesto.segmentos.length}</td>
                    <td>
                      <span className={`${styles.badge} ${!item.publicado ? styles.badgeMuted : ""}`}>
                        {item.publicado ? "Publicada" : "Borrador"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className={`${styles.button} ${styles.danger}`}
                        style={{ padding: "4px 8px", fontSize: "0.8rem", height: "auto", display: "inline-flex", alignItems: "center", gap: "4px" }}
                        onClick={() => handleDiscontinue(item.id, item.version)}
                        disabled={busy}
                        title="Descontinuar versión"
                      >
                        <Trash2 size={13} /> Descontinuar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody></table> : <div className={styles.empty}>No hay versiones publicadas.</div>}
            </div>
          </section>
          <section className={styles.panel}>
            <div className={styles.panelHeader}><h2 className={styles.panelTitle}>Publicar version</h2><Plus size={17} /></div>
            <form className={styles.panelBody} onSubmit={uploadVersion}>
              <div className={styles.formGrid}>
                <label className={styles.field}><span className={styles.label}>Version</span><input required name="version" placeholder="1.0.0" className={styles.input} /></label>
                <label className={styles.field}><span className={styles.label}>Chip</span><select name="chip" className={styles.select}><option>ESP32</option><option>ESP32-S3</option></select></label>
                <label className={styles.field}><span className={styles.label}>Funcion</span><select name="tipo_dispositivo" className={styles.select}><option value="sensores">Sensores</option><option value="riego">Riego y tanque</option></select></label>
                <label className={styles.field}><span className={styles.label}>Descripcion</span><input name="descripcion" className={styles.input} /></label>
                <label className={`${styles.field} ${styles.fieldFull}`}><span className={styles.label}>Binarios</span><input required type="file" accept=".bin" multiple className={styles.input} onChange={chooseFiles} /></label>
              </div>
              {uploadSegments.map((segment, index) => <div className={styles.fileRow} key={`${segment.file.name}-${index}`}>
                <div className={styles.field}><span className={styles.label}>Archivo</span><span style={{ color: "#cbdbe3", overflowWrap: "anywhere" }}>{segment.file.name}</span></div>
                <label className={styles.field}><span className={styles.label}>Direccion</span><input className={styles.input} value={segment.address} onChange={(e) => setUploadSegments((items) => items.map((item, i) => i === index ? { ...item, address: e.target.value } : item))} /></label>
                <button type="button" title="Quitar archivo" className={`${styles.button} ${styles.danger}`} onClick={() => setUploadSegments((items) => items.filter((_, i) => i !== index))}><Trash2 size={15} /></button>
              </div>)}
              <div className={styles.actions}><button className={`${styles.button} ${styles.primary}`} disabled={uploading}>{uploading ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />} Publicar</button></div>
            </form>
          </section>
        </div>
      )}

      {tab === "history" && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}><h2 className={styles.panelTitle}>Instalaciones recientes</h2><History size={17} /></div>
          <div className={styles.tableWrap}>
            {initialInstallations.length ? <table className={styles.table}><thead><tr><th>Fecha</th><th>Dispositivo</th><th>Firmware</th><th>Chip</th><th>Progreso</th><th>Estado</th></tr></thead><tbody>
              {initialInstallations.map((item) => <tr key={item.id}><td>{new Date(item.fecha_inicio).toLocaleString("es-PE")}</td><td>#{item.id_dispositivo}</td><td>#{item.id_firmware}</td><td>{item.chip_detectado || "-"}</td><td>{item.progreso}%</td><td><span className={`${styles.badge} ${item.estado !== "completada" ? styles.badgeMuted : ""}`}>{item.estado}</span></td></tr>)}
            </tbody></table> : <div className={styles.empty}>No hay instalaciones registradas.</div>}
          </div>
        </section>
      )}
    </main>
  );
}
