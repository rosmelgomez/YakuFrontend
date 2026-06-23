"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Badge, Box, Button, Card, Dialog, Flex, Grid, Select, Text, TextField } from "@radix-ui/themes";
import { Cpu, Layers, Plus } from "lucide-react";
import {
  asignarDispositivoACultivo,
  cambiarEstadoComponenteStock,
  cambiarEstadoDispositivoStock,
  liberarDispositivoAStock,
  obtenerSiguienteClientId,
  registrarComponente,
  registrarDispositivo,
} from "@/actions/admin";

export default function DispositivosClient({
  initialUsers = [],
  initialDevices = [],
  initialCrops = [],
  tiposDispositivo = [],
  tiposComponente = [],
  initialAlmacenes = [],
  initialComponents = [],
}: any) {
  const [devices, setDevices] = useState(initialDevices);
  const [components] = useState(initialComponents);
  const [isPending, startTransition] = useTransition();
  const [isOpenRegisterDevice, setIsOpenRegisterDevice] = useState(false);
  const [isOpenRegisterComponent, setIsOpenRegisterComponent] = useState(false);
  const [isOpenAssignDevice, setIsOpenAssignDevice] = useState(false);
  const [newDeviceTipoId, setNewDeviceTipoId] = useState("");
  const [newDeviceNombre, setNewDeviceNombre] = useState("");
  const [newDeviceMac, setNewDeviceMac] = useState("");
  const [newDeviceMqtt, setNewDeviceMqtt] = useState("");
  const [newDevicePub, setNewDevicePub] = useState("");
  const [newDeviceSub, setNewDeviceSub] = useState("");
  const [newDeviceAlmacenId, setNewDeviceAlmacenId] = useState("");
  const [newDeviceFirmware, setNewDeviceFirmware] = useState("v1.0.0");
  const [newCompTipoId, setNewCompTipoId] = useState("");
  const [newCompSerial, setNewCompSerial] = useState("");
  const [newCompAlmacenId, setNewCompAlmacenId] = useState("");
  const [assignDeviceId, setAssignDeviceId] = useState("");
  const [assignUserId, setAssignUserId] = useState("");
  const [assignCropId, setAssignCropId] = useState("");

  useEffect(() => {
    if (!isOpenRegisterDevice) return;
    if (!newDeviceTipoId && tiposDispositivo.length > 0) setNewDeviceTipoId(tiposDispositivo[0].id.toString());

    obtenerSiguienteClientId()
      .then((res) => setNewDeviceMqtt(res?.siguiente_client_id || ""))
      .catch(() => {
        const next = devices.length + 1;
        setNewDeviceMqtt(`ESP32_Yaku_${next.toString().padStart(3, "0")}`);
      });
  }, [isOpenRegisterDevice, newDeviceTipoId, tiposDispositivo, devices.length]);

  useEffect(() => {
    if (newDeviceTipoId === "1") {
      setNewDevicePub("yaku/riego/datos");
      setNewDeviceSub("yaku/valvula/comando");
    } else if (newDeviceTipoId === "2") {
      setNewDevicePub("yaku/tanque/datos");
      setNewDeviceSub("yaku/riego/comando");
    } else {
      setNewDevicePub("");
      setNewDeviceSub("");
    }
  }, [newDeviceTipoId]);

  const filteredCrops = initialCrops.filter((c: any) => c.id_usuario?.toString() === assignUserId);

  const handleRegisterDeviceSubmit = async () => {
    if (!newDeviceTipoId || !newDeviceNombre || !newDeviceAlmacenId || !newDeviceMqtt || !newDevicePub || !newDeviceSub) {
      alert("Complete los datos obligatorios del dispositivo.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await registrarDispositivo({
          id_tipo: parseInt(newDeviceTipoId, 10),
          nombre: newDeviceNombre,
          mac_address: newDeviceMac || undefined,
          client_id_mqtt: newDeviceMqtt,
          topic_pub: newDevicePub,
          topic_sub: newDeviceSub,
          id_almacen: parseInt(newDeviceAlmacenId, 10),
          firmware_version: newDeviceFirmware || undefined,
          estado: "disponible",
        });
        if (res.id || res.id_dispositivo) window.location.reload();
      } catch (err: any) {
        alert(`Error al registrar dispositivo: ${err.message}`);
      }
    });
  };

  const handleRegisterComponentSubmit = async () => {
    if (!newCompTipoId || !newCompAlmacenId) {
      alert("Seleccione modelo y almacen.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await registrarComponente({
          id_tipo_componente: parseInt(newCompTipoId, 10),
          numero_serie: newCompSerial || undefined,
          id_almacen: parseInt(newCompAlmacenId, 10),
          estado: "disponible",
        });
        if (res.id) window.location.reload();
      } catch (err: any) {
        alert(`Error al registrar componente: ${err.message}`);
      }
    });
  };

  const handleAssignDevice = async () => {
    if (!assignDeviceId || !assignUserId || !assignCropId) {
      alert("Seleccione dispositivo, agricultor y cultivo.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await asignarDispositivoACultivo(parseInt(assignDeviceId, 10), parseInt(assignUserId, 10), parseInt(assignCropId, 10));
        if (res.status === "ok") window.location.reload();
      } catch (err: any) {
        alert(`Error al asignar dispositivo: ${err.message}`);
      }
    });
  };

  const handleCambiarEstadoDispositivo = async (dispositivoId: number, nuevoEstado: string) => {
    startTransition(async () => {
      try {
        const res = await cambiarEstadoDispositivoStock(dispositivoId, nuevoEstado);
        if (res.status === "ok") window.location.reload();
      } catch (err: any) {
        alert(`Error al cambiar estado: ${err.message}`);
      }
    });
  };

  const handleCambiarEstadoComponente = async (componenteId: number, nuevoEstado: string) => {
    startTransition(async () => {
      try {
        const res = await cambiarEstadoComponenteStock(componenteId, nuevoEstado);
        if (res.status === "ok") window.location.reload();
      } catch (err: any) {
        alert(`Error al cambiar estado: ${err.message}`);
      }
    });
  };

  const handleLiberarDispositivo = async (device: any) => {
    if (!confirm(`Seguro que desea liberar '${device.nombre}'?`)) return;
    startTransition(async () => {
      try {
        const res = await liberarDispositivoAStock(device.id);
        if (res.status === "ok") {
          setDevices((prev: any[]) => prev.map((d) => (d.id === device.id ? { ...d, estado: "disponible" } : d)));
          window.location.reload();
        }
      } catch (err: any) {
        alert(`Error al liberar dispositivo: ${err.message}`);
      }
    });
  };

  return (
    <Box style={{ opacity: isPending ? 0.6 : 1, transition: "opacity 0.2s" }}>
      <Flex direction="column" gap="4" mb="6">
        <Box>
          <Text size="6" weight="bold" color="indigo" as="div">Dispositivos</Text>
          <Text size="2" color="gray" style={{ fontFamily: "monospace" }}>Gestiona stock IoT, componentes y asignaciones.</Text>
        </Box>
      </Flex>

      <Flex gap="3" mb="4" wrap="wrap">
        <Button color="indigo" onClick={() => setIsOpenRegisterDevice(true)}><Plus size={16} style={{ marginRight: "4px" }} /> Registrar Dispositivo</Button>
        <Button color="teal" onClick={() => setIsOpenRegisterComponent(true)}><Plus size={16} style={{ marginRight: "4px" }} /> Registrar Componente</Button>
        <Button color="green" onClick={() => setIsOpenAssignDevice(true)}><Plus size={16} style={{ marginRight: "4px" }} /> Asignar Dispositivo</Button>
      </Flex>

      <Grid columns={{ initial: "1", lg: "2" }} gap="5" mb="5">
        <Card size="3" style={{ background: "var(--surface-mockup)", borderColor: "var(--border-mockup)", borderRadius: "16px" }}>
          <Flex align="center" gap="2" mb="4"><Cpu size={20} color="#34d399" /><Text size="4" weight="bold" color="indigo">Dispositivos en Stock</Text></Flex>
          <Grid columns={{ initial: "1", md: "2" }} gap="3">
            {devices.filter((d: any) => d.en_almacen === true && ["disponible", "reparacion"].includes(d.estado)).map((d: any) => (
              <Card key={d.id} style={{ background: "var(--surface2-mockup)", borderColor: "var(--border-mockup)" }}>
                <Text size="2" weight="bold" style={{ color: "white" }} as="div">{d.nombre}</Text>
                <Text size="1" color="gray" style={{ fontFamily: "monospace" }}>MAC: {d.mac_address || "Sin MAC"}</Text>
                <Flex gap="1" mt="1" align="center" wrap="wrap">
                  <Badge color="green" size="1" variant="outline">{d.tipo?.nombre}</Badge>
                  {d.almacen && <Badge color="blue" size="1" variant="soft">{d.almacen.nombre}</Badge>}
                  <Badge color={d.estado === "reparacion" ? "amber" : "green"} size="1" variant="soft">{d.estado}</Badge>
                </Flex>
                <Flex justify="end" gap="2" mt="3">
                  <Button size="1" color="amber" variant="soft" onClick={() => handleCambiarEstadoDispositivo(d.id, d.estado === "reparacion" ? "disponible" : "reparacion")}>{d.estado === "reparacion" ? "Disponible" : "Reparacion"}</Button>
                  <Button size="1" color="red" variant="soft" onClick={() => handleCambiarEstadoDispositivo(d.id, "Retirado")}>Retirar</Button>
                </Flex>
              </Card>
            ))}
          </Grid>
        </Card>

        <Card size="3" style={{ background: "var(--surface-mockup)", borderColor: "var(--border-mockup)", borderRadius: "16px" }}>
          <Flex align="center" gap="2" mb="4"><Layers size={20} color="#a78bfa" /><Text size="4" weight="bold" color="indigo">Componentes en Stock</Text></Flex>
          <Grid columns={{ initial: "1", md: "2" }} gap="3">
            {components.filter((c: any) => c.en_almacen === true).map((c: any) => (
              <Card key={c.id} style={{ background: "var(--surface2-mockup)", borderColor: "var(--border-mockup)" }}>
                <Text size="2" weight="bold" style={{ color: "white" }} as="div">{c.modelo?.nombre_modelo || "Componente"}</Text>
                <Text size="1" color="gray" style={{ fontFamily: "monospace" }}>S/N: {c.numero_serie || "Sin S/N"}</Text>
                <Flex gap="1" mt="1" wrap="wrap">
                  <Badge color="indigo" size="1" variant="outline">{c.modelo?.categoria || "desconocido"}</Badge>
                  <Badge color={c.estado === "reparacion" ? "amber" : "green"} size="1" variant="soft">{c.estado}</Badge>
                </Flex>
                <Flex justify="end" gap="2" mt="3">
                  <Button size="1" color="amber" variant="soft" onClick={() => handleCambiarEstadoComponente(c.id, c.estado === "reparacion" ? "disponible" : "reparacion")}>{c.estado === "reparacion" ? "Disponible" : "Reparacion"}</Button>
                  <Button size="1" color="red" variant="soft" onClick={() => handleCambiarEstadoComponente(c.id, "Retirado")}>Retirar</Button>
                </Flex>
              </Card>
            ))}
          </Grid>
        </Card>
      </Grid>

      <Card size="3" style={{ background: "var(--surface-mockup)", borderColor: "var(--border-mockup)", borderRadius: "16px" }}>
        <Flex align="center" gap="2" mb="4"><Layers size={20} color="#60a5fa" /><Text size="4" weight="bold" color="indigo">Nodos en Campo</Text></Flex>
        <Grid columns={{ initial: "1", md: "2", lg: "3", xl: "4" }} gap="4">
          {devices.filter((d: any) => d.estado === "asignado").map((d: any) => {
            const assign = d.asignaciones_iot?.[0];
            return (
              <Card key={d.id} style={{ background: "var(--surface2-mockup)", borderColor: "var(--border-mockup)" }}>
                <Text size="2" weight="bold" style={{ color: "white" }} as="div">{d.nombre}</Text>
                <Text size="1" color="gray" style={{ fontFamily: "monospace" }}>MAC: {d.mac_address || "Sin MAC"}</Text>
                {assign && <Text size="1" color="indigo" style={{ display: "block", marginTop: "4px" }}>Asignado a: {assign.usuario?.nombre} - {assign.cultivo?.nombre_planta}</Text>}
                <Button size="1" color="red" variant="soft" mt="3" onClick={() => handleLiberarDispositivo(d)}>Liberar</Button>
              </Card>
            );
          })}
        </Grid>
      </Card>

      <Dialog.Root open={isOpenRegisterDevice} onOpenChange={setIsOpenRegisterDevice}>
        <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 520, background: "var(--surface-mockup)", border: "1px solid var(--border-mockup)" }}>
          <Dialog.Title style={{ color: "white" }}>Registrar Nuevo Dispositivo IoT</Dialog.Title>
          <Flex direction="column" gap="3" mt="3">
            <Select.Root value={newDeviceTipoId} onValueChange={setNewDeviceTipoId}><Select.Trigger placeholder="Tipo" /><Select.Content>{tiposDispositivo.map((t: any) => <Select.Item key={t.id} value={t.id.toString()}>{t.nombre}</Select.Item>)}</Select.Content></Select.Root>
            <TextField.Root placeholder="Nombre del dispositivo" value={newDeviceNombre} onChange={(e) => setNewDeviceNombre(e.target.value)} />
            <TextField.Root placeholder="MAC" value={newDeviceMac} onChange={(e) => setNewDeviceMac(e.target.value)} />
            <Grid columns="2" gap="3"><TextField.Root value={newDeviceMqtt} disabled /><TextField.Root value={newDeviceFirmware} onChange={(e) => setNewDeviceFirmware(e.target.value)} /></Grid>
            <Grid columns="2" gap="3"><TextField.Root value={newDevicePub} disabled /><TextField.Root value={newDeviceSub} disabled /></Grid>
            <Select.Root value={newDeviceAlmacenId} onValueChange={setNewDeviceAlmacenId}><Select.Trigger placeholder="Almacen" /><Select.Content>{initialAlmacenes.map((a: any) => <Select.Item key={a.id} value={a.id.toString()}>{a.nombre}</Select.Item>)}</Select.Content></Select.Root>
          </Flex>
          <Flex gap="3" mt="6" justify="end"><Dialog.Close><Button variant="soft" color="gray">Cancelar</Button></Dialog.Close><Button color="green" onClick={handleRegisterDeviceSubmit}>Registrar</Button></Flex>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={isOpenRegisterComponent} onOpenChange={setIsOpenRegisterComponent}>
        <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 450, background: "var(--surface-mockup)", border: "1px solid var(--border-mockup)" }}>
          <Dialog.Title style={{ color: "white" }}>Registrar Componente</Dialog.Title>
          <Flex direction="column" gap="3" mt="3">
            <Select.Root value={newCompTipoId} onValueChange={setNewCompTipoId}><Select.Trigger placeholder="Modelo" /><Select.Content>{tiposComponente.map((t: any) => <Select.Item key={t.id} value={t.id.toString()}>{t.nombre_modelo} ({t.categoria})</Select.Item>)}</Select.Content></Select.Root>
            <TextField.Root placeholder="Numero de serie" value={newCompSerial} onChange={(e) => setNewCompSerial(e.target.value)} />
            <Select.Root value={newCompAlmacenId} onValueChange={setNewCompAlmacenId}><Select.Trigger placeholder="Almacen" /><Select.Content>{initialAlmacenes.map((a: any) => <Select.Item key={a.id} value={a.id.toString()}>{a.nombre}</Select.Item>)}</Select.Content></Select.Root>
          </Flex>
          <Flex gap="3" mt="6" justify="end"><Dialog.Close><Button variant="soft" color="gray">Cancelar</Button></Dialog.Close><Button color="green" onClick={handleRegisterComponentSubmit}>Registrar</Button></Flex>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={isOpenAssignDevice} onOpenChange={setIsOpenAssignDevice}>
        <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 450, background: "var(--surface-mockup)", border: "1px solid var(--border-mockup)" }}>
          <Dialog.Title style={{ color: "white" }}>Asignar Dispositivo</Dialog.Title>
          <Flex direction="column" gap="3" mt="3">
            <Select.Root value={assignDeviceId} onValueChange={setAssignDeviceId}><Select.Trigger placeholder="Dispositivo" /><Select.Content>{devices.filter((d: any) => d.en_almacen && d.estado === "disponible").map((d: any) => <Select.Item key={d.id} value={d.id.toString()}>{d.nombre}</Select.Item>)}</Select.Content></Select.Root>
            <Select.Root value={assignUserId} onValueChange={(v) => { setAssignUserId(v); setAssignCropId(""); }}><Select.Trigger placeholder="Agricultor" /><Select.Content>{initialUsers.filter((u: any) => u.id_rol === 2).map((u: any) => <Select.Item key={u.id} value={u.id.toString()}>{u.nombre} {u.apellido || ""}</Select.Item>)}</Select.Content></Select.Root>
            <Select.Root value={assignCropId} onValueChange={setAssignCropId} disabled={!assignUserId}><Select.Trigger placeholder="Cultivo" /><Select.Content>{filteredCrops.map((c: any) => <Select.Item key={c.id} value={c.id.toString()}>{c.nombre_planta}</Select.Item>)}</Select.Content></Select.Root>
          </Flex>
          <Flex gap="3" mt="6" justify="end"><Dialog.Close><Button variant="soft" color="gray">Cancelar</Button></Dialog.Close><Button color="green" onClick={handleAssignDevice}>Asignar</Button></Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
}
