"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Badge, Box, Button, Card, Checkbox, Dialog, Flex, Grid, Text, TextField } from "@radix-ui/themes";
import { Cpu, Layers, Plus, Trash2 } from "lucide-react";
import SearchableSelect from "@/components/ui/SearchableSelect";
import {
  actualizarAsignacionComponente,
  asignarComponenteADispositivo,
  asignarDispositivoACultivo,
  cambiarEstadoComponenteStock,
  cambiarEstadoDispositivoStock,
  desvincularComponenteDeDispositivo,
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
  fuentesAgua = [],
  metricas = [],
}: any) {
  type AssignComponentDraft = {
    id: string;
    componentId: string;
    pin: string;
    metricIds: string[];
    fuenteAguaId: string;
  };

  const [devices, setDevices] = useState(initialDevices);
  const [components] = useState(initialComponents);
  const [isPending, startTransition] = useTransition();
  const [isOpenRegisterDevice, setIsOpenRegisterDevice] = useState(false);
  const [isOpenRegisterComponent, setIsOpenRegisterComponent] = useState(false);
  const [isOpenAssignDevice, setIsOpenAssignDevice] = useState(false);
  const [isOpenAssignComponent, setIsOpenAssignComponent] = useState(false);
  const [isOpenEditAssignment, setIsOpenEditAssignment] = useState(false);
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
  const [assignComponents, setAssignComponents] = useState<AssignComponentDraft[]>([]);
  const [componentDeviceId, setComponentDeviceId] = useState("");
  const [componentId, setComponentId] = useState("");
  const [componentPin, setComponentPin] = useState("");
  const [componentMetricIds, setComponentMetricIds] = useState<string[]>([]);
  const [componentFuenteAguaId, setComponentFuenteAguaId] = useState("");
  const [editAssignment, setEditAssignment] = useState<any>(null);
  const [editPin, setEditPin] = useState("");
  const [editMetricId, setEditMetricId] = useState("");
  const [editFuenteAguaId, setEditFuenteAguaId] = useState("");

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
  const WATER_SOURCE_EMPTY_MESSAGE = "No hay fuentes de agua disponibles para este cultivo";
  const selectedAssignDevice = devices.find((d: any) => d.id?.toString() === assignDeviceId);
  const selectedComponent = components.find((c: any) => c.id?.toString() === componentId);
  const selectedComponentModel = selectedComponent?.modelo;
  const assignedDevices = devices.filter((d: any) => d.estado === "asignado");
  const availableComponents = components.filter((c: any) => c.en_almacen === true && c.estado === "disponible");
  const selectedFieldDevice = assignedDevices.find((d: any) => d.id?.toString() === componentDeviceId);
  const fieldDeviceBaseAssignment = selectedFieldDevice?.asignaciones_iot?.find((a: any) => !a.id_componente) || selectedFieldDevice?.asignaciones_iot?.[0];
  const fieldDeviceUserId = fieldDeviceBaseAssignment?.id_usuario;
  const fieldDeviceCropId = fieldDeviceBaseAssignment?.id_cultivo;
  const metricByCode = (code: string) => metricas.find((m: any) => m.codigo === code);
  const getCropId = (crop: any) => crop?.id_cultivo ?? crop?.id;
  const getCropWaterSourceId = (crop: any) => crop?.id_fuente_agua;
  const findCrop = (cropId: any) => initialCrops.find((c: any) => getCropId(c)?.toString() === cropId?.toString());
  const waterSourcesForAssignment = (userId: any, cropId: any) => {
    const crop = findCrop(cropId);
    const cropWaterSourceId = getCropWaterSourceId(crop);
    if (!userId || !crop || !cropWaterSourceId) return [];
    return fuentesAgua.filter(
      (f: any) => f.id_usuario?.toString() === userId?.toString() &&
        f.id?.toString() === cropWaterSourceId?.toString()
    );
  };
  const assignWaterSources = waterSourcesForAssignment(assignUserId, assignCropId);
  const availableWaterSources = waterSourcesForAssignment(fieldDeviceUserId, fieldDeviceCropId);
  const editWaterSources = waterSourcesForAssignment(editAssignment?.id_usuario, editAssignment?.id_cultivo);
  const isTankDevice = (device: any) => {
    const typeName = `${device?.tipo?.nombre || ""} ${device?.tipo?.descripcion || ""}`.toLowerCase();
    const topicPub = `${device?.topic_pub || ""}`.toLowerCase();
    const name = `${device?.nombre || ""}`.toLowerCase();
    return typeName.includes("tanque") || typeName.includes("nivel") || name.includes("tanque") || topicPub.includes("/tanque/");
  };
  const showAssignWaterSource = isTankDevice(selectedAssignDevice);
  const showFieldWaterSource = isTankDevice(selectedFieldDevice);
  const showEditWaterSource = isTankDevice(editAssignment?.device);
  const isActuatorModel = (model: any) => `${model?.categoria || ""}`.toLowerCase() === "actuador";
  const selectedComponentIsActuator = isActuatorModel(selectedComponentModel);
  const editAssignmentIsActuator = isActuatorModel(editAssignment?.componente?.modelo);

  const inferMetricIdsForComponent = (value: string) => {
    const comp = components.find((c: any) => c.id?.toString() === value);
    const model = comp?.modelo;
    if (isActuatorModel(model)) return [];

    const modelMetricId = model?.id_tipo_metrica?.toString();
    const modelName = `${model?.nombre_modelo || ""} ${model?.descripcion || ""}`.toLowerCase();

    if (modelMetricId) return [modelMetricId];
    if (modelName.includes("dht") || (modelName.includes("temp") && modelName.includes("hum"))) {
      return [metricByCode("TEMP_AMB")?.id, metricByCode("HUM_AMB")?.id]
        .filter(Boolean)
        .map((id: number) => id.toString());
    }
    return [];
  };

  const resetAssignComponentForm = () => {
    setComponentDeviceId("");
    setComponentId("");
    setComponentPin("");
    setComponentMetricIds([]);
    setComponentFuenteAguaId("");
  };

  const resetAssignDeviceForm = () => {
    setAssignDeviceId("");
    setAssignUserId("");
    setAssignCropId("");
    setAssignComponents([]);
  };

  const addAssignComponentRow = () => {
    setAssignComponents((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        componentId: "",
        pin: "",
        metricIds: [],
        fuenteAguaId: "",
      },
    ]);
  };

  const updateAssignComponentRow = (rowId: string, patch: Partial<AssignComponentDraft>) => {
    setAssignComponents((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  };

  const removeAssignComponentRow = (rowId: string) => {
    setAssignComponents((prev) => prev.filter((row) => row.id !== rowId));
  };

  const handleAssignComponentSelection = (rowId: string, value: string) => {
    updateAssignComponentRow(rowId, {
      componentId: value,
      metricIds: inferMetricIdsForComponent(value),
      fuenteAguaId: "",
    });
  };

  const toggleAssignComponentMetric = (rowId: string, metricId: string, checked: boolean) => {
    setAssignComponents((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const metricIds = checked
          ? row.metricIds.includes(metricId) ? row.metricIds : [...row.metricIds, metricId]
          : row.metricIds.filter((id) => id !== metricId);
        return { ...row, metricIds };
      })
    );
  };

  const openAssignComponentDialog = (device: any) => {
    setComponentDeviceId(device.id.toString());
    setComponentId("");
    setComponentPin("");
    setComponentMetricIds([]);
    setComponentFuenteAguaId("");
    setIsOpenAssignComponent(true);
  };

  const handleComponentSelection = (value: string) => {
    setComponentId(value);
    setComponentMetricIds(inferMetricIdsForComponent(value));
  };

  const toggleComponentMetric = (metricId: string, checked: boolean) => {
    setComponentMetricIds((prev) => {
      if (checked) return prev.includes(metricId) ? prev : [...prev, metricId];
      return prev.filter((id) => id !== metricId);
    });
  };

  const groupComponentAssignments = (assignments: any[]) => {
    return assignments.reduce((groups: any[], assignment: any) => {
      const componentId = assignment.id_componente;
      const existing = groups.find((group) => group.id_componente === componentId);
      if (existing) {
        existing.assignments.push(assignment);
        return groups;
      }
      groups.push({
        id_componente: componentId,
        component: assignment.componente,
        assignments: [assignment],
      });
      return groups;
    }, []);
  };

  const openEditAssignmentDialog = (assignment: any, device: any) => {
    setEditAssignment({ ...assignment, device });
    setEditPin(assignment.pin_gpio?.toString() || "");
    setEditMetricId(assignment.id_tipo_metrica?.toString() || "");
    setEditFuenteAguaId(assignment.id_fuente_agua?.toString() || "");
    setIsOpenEditAssignment(true);
  };

  const resetEditAssignmentForm = () => {
    setEditAssignment(null);
    setEditPin("");
    setEditMetricId("");
    setEditFuenteAguaId("");
  };

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

    for (const row of assignComponents) {
      const rowComponent = components.find((c: any) => c.id?.toString() === row.componentId);
      const rowIsActuator = isActuatorModel(rowComponent?.modelo);
      if (!row.componentId || !row.pin || (!rowIsActuator && row.metricIds.length === 0)) {
        alert(rowIsActuator
          ? "Complete componente y pin GPIO por cada actuador agregado."
          : "Complete componente, pin GPIO y al menos un parametro por cada componente agregado."
        );
        return;
      }

      const pin = parseInt(row.pin, 10);
      if (!Number.isInteger(pin) || pin < 0) {
        alert("Ingrese un pin GPIO valido en todos los componentes.");
        return;
      }
    }

    startTransition(async () => {
      try {
        const res = await asignarDispositivoACultivo(parseInt(assignDeviceId, 10), parseInt(assignUserId, 10), parseInt(assignCropId, 10));
        if (res.status === "ok") {
          for (const row of assignComponents) {
            const rowComponent = components.find((c: any) => c.id?.toString() === row.componentId);
            const rowIsActuator = isActuatorModel(rowComponent?.modelo);
            await asignarComponenteADispositivo({
              id_dispositivo: parseInt(assignDeviceId, 10),
              id_componente: parseInt(row.componentId, 10),
              pin_gpio: parseInt(row.pin, 10),
              id_tipo_metrica: rowIsActuator ? null : row.metricIds.map((id) => parseInt(id, 10)),
              id_fuente_agua: showAssignWaterSource && assignWaterSources.some((f: any) => f.id?.toString() === row.fuenteAguaId) ? parseInt(row.fuenteAguaId, 10) : undefined,
            });
          }
          window.location.reload();
        }
      } catch (err: any) {
        alert(`Error al asignar dispositivo: ${err.message}`);
      }
    });
  };

  const handleAssignComponent = async () => {
    if (!componentDeviceId || !componentId || !componentPin || (!selectedComponentIsActuator && componentMetricIds.length === 0)) {
      alert(selectedComponentIsActuator
        ? "Seleccione dispositivo, componente y pin GPIO."
        : "Seleccione dispositivo, componente, pin GPIO y al menos un parametro de captura."
      );
      return;
    }

    const pin = parseInt(componentPin, 10);
    if (!Number.isInteger(pin) || pin < 0) {
      alert("Ingrese un pin GPIO valido.");
      return;
    }

    startTransition(async () => {
      try {
        const metricPayload = componentMetricIds.map((id) => parseInt(id, 10));
        const res = await asignarComponenteADispositivo({
          id_dispositivo: parseInt(componentDeviceId, 10),
          id_componente: parseInt(componentId, 10),
          pin_gpio: pin,
          id_tipo_metrica: selectedComponentIsActuator ? null : metricPayload.length === 1 ? metricPayload[0] : metricPayload,
          id_fuente_agua: showFieldWaterSource && availableWaterSources.some((f: any) => f.id?.toString() === componentFuenteAguaId) ? parseInt(componentFuenteAguaId, 10) : undefined,
        });
        if (res.status === "ok") window.location.reload();
      } catch (err: any) {
        alert(`Error al asignar componente: ${err.message}`);
      }
    });
  };

  const handleUpdateAssignment = async () => {
    if (!editAssignment || !editPin || (!editAssignmentIsActuator && !editMetricId)) {
      alert(editAssignmentIsActuator ? "Complete GPIO." : "Complete GPIO y parametro de captura.");
      return;
    }

    const pin = parseInt(editPin, 10);
    const metricId = editAssignmentIsActuator ? null : parseInt(editMetricId, 10);
    if (!Number.isInteger(pin) || pin < 0 || (!editAssignmentIsActuator && !Number.isInteger(metricId))) {
      alert("Ingrese valores validos para GPIO y parametro.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await actualizarAsignacionComponente(editAssignment.id, {
          pin_gpio: pin,
          id_tipo_metrica: metricId,
          id_fuente_agua: showEditWaterSource && editWaterSources.some((f: any) => f.id?.toString() === editFuenteAguaId) ? parseInt(editFuenteAguaId, 10) : undefined,
        });
        if (res.status === "ok") window.location.reload();
      } catch (err: any) {
        alert(`Error al actualizar asignacion: ${err.message}`);
      }
    });
  };

  const handleUnlinkComponent = async (device: any, componentGroup: any) => {
    const componentName = componentGroup.component?.modelo?.nombre_modelo || "este componente";
    if (!confirm(`Seguro que desea desvincular ${componentName} de ${device.nombre}?`)) return;

    startTransition(async () => {
      try {
        const res = await desvincularComponenteDeDispositivo(device.id, componentGroup.id_componente);
        if (res.status === "ok") window.location.reload();
      } catch (err: any) {
        alert(`Error al desvincular componente: ${err.message}`);
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
          {assignedDevices.map((d: any) => {
            const assign = d.asignaciones_iot?.find((a: any) => !a.id_componente) || d.asignaciones_iot?.[0];
            const componentAssignments = d.asignaciones_iot?.filter((a: any) => a.id_componente) || [];
            const componentGroups = groupComponentAssignments(componentAssignments);
            return (
              <Card key={d.id} style={{ background: "var(--surface2-mockup)", borderColor: "var(--border-mockup)" }}>
                <Text size="2" weight="bold" style={{ color: "white" }} as="div">{d.nombre}</Text>
                <Text size="1" color="gray" style={{ fontFamily: "monospace" }}>MAC: {d.mac_address || "Sin MAC"}</Text>
                {assign && <Text size="1" color="indigo" style={{ display: "block", marginTop: "4px" }}>Asignado a: {assign.usuario?.nombre} - {assign.cultivo?.nombre_planta}</Text>}
                <Flex direction="column" gap="2" mt="3">
                  {componentGroups.length === 0 ? (
                    <Badge color="gray" size="1" variant="soft">Sin componentes</Badge>
                  ) : (
                    componentGroups.map((group: any) => (
                      <Box key={group.id_componente} style={{ border: "1px solid var(--border-mockup)", borderRadius: 8, padding: 8 }}>
                        <Flex justify="between" gap="2" align="center" mb="2">
                          <Box>
                            <Text size="2" weight="bold" style={{ color: "white" }} as="div">{group.component?.modelo?.nombre_modelo || "Componente"}</Text>
                            <Text size="1" color="gray">S/N: {group.component?.numero_serie || "Sin S/N"}</Text>
                          </Box>
                          <Button size="1" color="red" variant="soft" onClick={() => handleUnlinkComponent(d, group)}>Desvincular</Button>
                        </Flex>
                        <Flex direction="column" gap="1">
                          {group.assignments.map((a: any) => (
                            <Flex key={a.id} justify="between" align="center" gap="2" wrap="wrap">
                              <Badge color="cyan" size="1" variant="soft">
                                {a.tipo_metrica?.codigo || "Actuador"} - GPIO {a.pin_gpio ?? "N/A"}
                              </Badge>
                              <Button size="1" color="blue" variant="soft" onClick={() => openEditAssignmentDialog(a, d)}>Editar</Button>
                            </Flex>
                          ))}
                        </Flex>
                      </Box>
                    ))
                  )}
                </Flex>
                <Flex gap="2" mt="3" wrap="wrap">
                  <Button size="1" color="green" variant="soft" onClick={() => openAssignComponentDialog(d)}>Agregar componente</Button>
                  <Button size="1" color="red" variant="soft" onClick={() => handleLiberarDispositivo(d)}>Liberar</Button>
                </Flex>
              </Card>
            );
          })}
        </Grid>
      </Card>

      <Dialog.Root open={isOpenRegisterDevice} onOpenChange={setIsOpenRegisterDevice}>
        <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 520, background: "var(--surface-mockup)", border: "1px solid var(--border-mockup)" }}>
          <Dialog.Title style={{ color: "white" }}>Registrar Nuevo Dispositivo IoT</Dialog.Title>
          <Flex direction="column" gap="3" mt="3">
            <SearchableSelect value={newDeviceTipoId} onValueChange={setNewDeviceTipoId} placeholder="Tipo" searchPlaceholder="Buscar tipo..." options={tiposDispositivo.map((t: any) => ({ value: t.id.toString(), label: t.nombre }))} />
            <TextField.Root placeholder="Nombre del dispositivo" value={newDeviceNombre} onChange={(e) => setNewDeviceNombre(e.target.value)} />
            <TextField.Root placeholder="MAC" value={newDeviceMac} onChange={(e) => setNewDeviceMac(e.target.value)} />
            <Grid columns="2" gap="3"><TextField.Root value={newDeviceMqtt} disabled /><TextField.Root value={newDeviceFirmware} onChange={(e) => setNewDeviceFirmware(e.target.value)} /></Grid>
            <Grid columns="2" gap="3"><TextField.Root value={newDevicePub} disabled /><TextField.Root value={newDeviceSub} disabled /></Grid>
            <SearchableSelect value={newDeviceAlmacenId} onValueChange={setNewDeviceAlmacenId} placeholder="Almacen" searchPlaceholder="Buscar almacen..." options={initialAlmacenes.map((a: any) => ({ value: a.id.toString(), label: a.nombre }))} />
          </Flex>
          <Flex gap="3" mt="6" justify="end"><Dialog.Close><Button variant="soft" color="gray">Cancelar</Button></Dialog.Close><Button color="green" onClick={handleRegisterDeviceSubmit}>Registrar</Button></Flex>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={isOpenRegisterComponent} onOpenChange={setIsOpenRegisterComponent}>
        <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 450, background: "var(--surface-mockup)", border: "1px solid var(--border-mockup)" }}>
          <Dialog.Title style={{ color: "white" }}>Registrar Componente</Dialog.Title>
          <Flex direction="column" gap="3" mt="3">
            <SearchableSelect value={newCompTipoId} onValueChange={setNewCompTipoId} placeholder="Modelo" searchPlaceholder="Buscar modelo..." options={tiposComponente.map((t: any) => ({ value: t.id.toString(), label: `${t.nombre_modelo} (${t.categoria})` }))} />
            <TextField.Root placeholder="Numero de serie" value={newCompSerial} onChange={(e) => setNewCompSerial(e.target.value)} />
            <SearchableSelect value={newCompAlmacenId} onValueChange={setNewCompAlmacenId} placeholder="Almacen" searchPlaceholder="Buscar almacen..." options={initialAlmacenes.map((a: any) => ({ value: a.id.toString(), label: a.nombre }))} />
          </Flex>
          <Flex gap="3" mt="6" justify="end"><Dialog.Close><Button variant="soft" color="gray">Cancelar</Button></Dialog.Close><Button color="green" onClick={handleRegisterComponentSubmit}>Registrar</Button></Flex>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={isOpenAssignDevice} onOpenChange={(open) => { setIsOpenAssignDevice(open); if (!open) resetAssignDeviceForm(); }}>
        <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 760, background: "var(--surface-mockup)", border: "1px solid var(--border-mockup)" }}>
          <Dialog.Title style={{ color: "white" }}>Asignar Dispositivo</Dialog.Title>
          <Flex direction="column" gap="3" mt="3">
            <SearchableSelect value={assignDeviceId} onValueChange={(value) => { setAssignDeviceId(value); setAssignComponents((prev) => prev.map((row) => ({ ...row, fuenteAguaId: "" }))); }} placeholder="Dispositivo" searchPlaceholder="Buscar dispositivo..." options={devices.filter((d: any) => d.en_almacen && d.estado === "disponible").map((d: any) => ({ value: d.id.toString(), label: d.nombre }))} />
            <SearchableSelect value={assignUserId} onValueChange={(v) => { setAssignUserId(v); setAssignCropId(""); setAssignComponents((prev) => prev.map((row) => ({ ...row, fuenteAguaId: "" }))); }} placeholder="Agricultor" searchPlaceholder="Buscar agricultor..." options={initialUsers.filter((u: any) => u.id_rol === 2).map((u: any) => ({ value: u.id.toString(), label: `${u.nombre} ${u.apellido || ""}`.trim() }))} />
            <SearchableSelect value={assignCropId} onValueChange={(value) => { setAssignCropId(value); setAssignComponents((prev) => prev.map((row) => ({ ...row, fuenteAguaId: "" }))); }} disabled={!assignUserId} placeholder="Cultivo" searchPlaceholder="Buscar cultivo..." options={filteredCrops.map((c: any) => ({ value: c.id.toString(), label: c.nombre_planta }))} />

            <Box mt="2" style={{ borderTop: "1px solid var(--border-mockup)", paddingTop: 14 }}>
              <Flex justify="between" align="center" gap="3" mb="3">
                <Box>
                  <Text size="3" weight="bold" style={{ color: "white" }} as="div">Componentes iniciales</Text>
                  <Text size="1" color="gray">Cada parametro seleccionado se registra como una asignacion independiente.</Text>
                </Box>
                <Button size="2" variant="soft" color="cyan" onClick={addAssignComponentRow}>
                  <Plus size={15} /> Agregar componente
                </Button>
              </Flex>

              {assignComponents.length === 0 ? (
                <Text size="2" color="gray">Puede asignar el dispositivo ahora y agregar componentes despues.</Text>
              ) : (
                <Flex direction="column" gap="3">
                  {assignComponents.map((row, index) => {
                    const selected = components.find((c: any) => c.id?.toString() === row.componentId);
                    const selectedModel = selected?.modelo;
                    const selectedIsActuator = isActuatorModel(selectedModel);
                    const selectedByOtherRows = assignComponents
                      .filter((item) => item.id !== row.id)
                      .map((item) => item.componentId)
                      .filter(Boolean);
                    const rowAvailableComponents = availableComponents.filter((c: any) => {
                      const value = c.id?.toString();
                      return value === row.componentId || !selectedByOtherRows.includes(value);
                    });

                    return (
                      <Card key={row.id} style={{ background: "var(--surface2-mockup)", borderColor: "var(--border-mockup)" }}>
                        <Flex justify="between" align="center" gap="3" mb="3">
                          <Text size="2" weight="bold" style={{ color: "white" }}>Componente {index + 1}</Text>
                          <Button size="1" color="red" variant="soft" onClick={() => removeAssignComponentRow(row.id)}>
                            <Trash2 size={14} />
                          </Button>
                        </Flex>

                        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
                          <SearchableSelect
                            value={row.componentId}
                            onValueChange={(value) => handleAssignComponentSelection(row.id, value)}
                            placeholder="Componente en stock"
                            searchPlaceholder="Buscar componente..."
                            options={rowAvailableComponents.map((c: any) => ({
                              value: c.id.toString(),
                              label: `${c.modelo?.nombre_modelo || "Componente"} ${c.numero_serie ? `(${c.numero_serie})` : ""}`.trim(),
                            }))}
                          />
                          <TextField.Root placeholder="Pin GPIO" value={row.pin} onChange={(e) => updateAssignComponentRow(row.id, { pin: e.target.value })} />
                          {showAssignWaterSource && (
                            assignWaterSources.length > 0 ? (
                              <SearchableSelect
                                value={row.fuenteAguaId}
                                onValueChange={(value) => updateAssignComponentRow(row.id, { fuenteAguaId: value })}
                                placeholder="Tanque / fuente de agua opcional"
                                searchPlaceholder="Buscar fuente..."
                                options={assignWaterSources.map((f: any) => ({ value: f.id.toString(), label: f.nombre }))}
                              />
                            ) : (
                              <Text size="2" color="gray">{WATER_SOURCE_EMPTY_MESSAGE}</Text>
                            )
                          )}
                        </Grid>

                        {selectedIsActuator ? (
                          <Text size="1" color="gray" as="div" mt="3">
                            Este componente es un actuador de salida; no captura parametros. Solo se registra el GPIO del rele.
                          </Text>
                        ) : (
                          <Box mt="3">
                            <Text size="2" weight="bold" style={{ color: "white" }} as="div" mb="2">Parametros que captura</Text>
                            <Grid columns={{ initial: "1", sm: "2" }} gap="2">
                              {metricas.map((m: any) => {
                                const metricId = m.id.toString();
                                return (
                                  <Flex key={m.id} align="center" gap="2" style={{ minHeight: 32 }}>
                                    <Checkbox
                                      checked={row.metricIds.includes(metricId)}
                                      onCheckedChange={(checked) => toggleAssignComponentMetric(row.id, metricId, checked === true)}
                                    />
                                    <Text size="2" style={{ color: "white" }}>{m.nombre} ({m.codigo})</Text>
                                  </Flex>
                                );
                              })}
                            </Grid>
                            {selectedModel && (
                              <Text size="1" color="gray" as="div" mt="2">Puede marcar varios parametros si el componente entrega mas de una lectura en el mismo pin.</Text>
                            )}
                          </Box>
                        )}
                      </Card>
                    );
                  })}
                </Flex>
              )}
            </Box>
          </Flex>
          <Flex gap="3" mt="6" justify="end"><Dialog.Close><Button variant="soft" color="gray">Cancelar</Button></Dialog.Close><Button color="green" onClick={handleAssignDevice}>Asignar</Button></Flex>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={isOpenAssignComponent} onOpenChange={(open) => { setIsOpenAssignComponent(open); if (!open) resetAssignComponentForm(); }}>
        <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 540, background: "var(--surface-mockup)", border: "1px solid var(--border-mockup)" }}>
          <Dialog.Title style={{ color: "white" }}>Agregar Componente al Dispositivo</Dialog.Title>
          <Flex direction="column" gap="3" mt="3">
            <SearchableSelect
              value={componentDeviceId}
              onValueChange={(value) => { setComponentDeviceId(value); setComponentFuenteAguaId(""); }}
              placeholder="Dispositivo asignado"
              searchPlaceholder="Buscar dispositivo..."
              options={assignedDevices.map((d: any) => ({ value: d.id.toString(), label: d.nombre }))}
            />
            <SearchableSelect
              value={componentId}
              onValueChange={handleComponentSelection}
              placeholder="Componente en stock"
              searchPlaceholder="Buscar componente..."
              options={availableComponents.map((c: any) => ({
                value: c.id.toString(),
                label: `${c.modelo?.nombre_modelo || "Componente"} ${c.numero_serie ? `(${c.numero_serie})` : ""}`.trim(),
              }))}
            />
            <Grid columns={{ initial: "1", sm: "2" }} gap="3">
              <TextField.Root placeholder="Pin GPIO" value={componentPin} onChange={(e) => setComponentPin(e.target.value)} />
              {showFieldWaterSource && (
                availableWaterSources.length > 0 ? (
                  <SearchableSelect
                    value={componentFuenteAguaId}
                    onValueChange={setComponentFuenteAguaId}
                    placeholder="Tanque / fuente de agua opcional"
                    searchPlaceholder="Buscar fuente..."
                    options={availableWaterSources.map((f: any) => ({ value: f.id.toString(), label: f.nombre }))}
                  />
                ) : (
                  <Text size="2" color="gray">{WATER_SOURCE_EMPTY_MESSAGE}</Text>
                )
              )}
            </Grid>
            {selectedComponentIsActuator ? (
              <Text size="1" color="gray">
                Este componente es un actuador de salida; no captura parametros. Solo se registra el GPIO del rele.
              </Text>
            ) : (
              <Box>
                <Text size="2" weight="bold" style={{ color: "white" }} as="div" mb="2">Parametros que captura</Text>
                <Grid columns={{ initial: "1", sm: "2" }} gap="2">
                  {metricas.map((m: any) => {
                    const metricId = m.id.toString();
                    return (
                      <Flex key={m.id} align="center" gap="2" style={{ minHeight: 32 }}>
                        <Checkbox
                          checked={componentMetricIds.includes(metricId)}
                          onCheckedChange={(checked) => toggleComponentMetric(metricId, checked === true)}
                        />
                        <Text size="2" style={{ color: "white" }}>{m.nombre} ({m.codigo})</Text>
                      </Flex>
                    );
                  })}
                </Grid>
                {selectedComponentModel && (
                  <Text size="1" color="gray" as="div" mt="2">Puede marcar varios parametros si el componente entrega mas de una lectura en el mismo pin.</Text>
                )}
              </Box>
            )}
            {fieldDeviceCropId && (
              <Text size="1" color="gray">Se vinculara al cultivo ID {fieldDeviceCropId} del dispositivo seleccionado.</Text>
            )}
          </Flex>
          <Flex gap="3" mt="6" justify="end"><Dialog.Close><Button variant="soft" color="gray">Cancelar</Button></Dialog.Close><Button color="green" onClick={handleAssignComponent}>Asignar componente</Button></Flex>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={isOpenEditAssignment} onOpenChange={(open) => { setIsOpenEditAssignment(open); if (!open) resetEditAssignmentForm(); }}>
        <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 460, background: "var(--surface-mockup)", border: "1px solid var(--border-mockup)" }}>
          <Dialog.Title style={{ color: "white" }}>Editar captura del componente</Dialog.Title>
          <Flex direction="column" gap="3" mt="3">
            <Text size="2" color="gray">
              {editAssignment?.componente?.modelo?.nombre_modelo || "Componente"} en {editAssignment?.device?.nombre || "dispositivo"}
            </Text>
            <TextField.Root placeholder="Pin GPIO" value={editPin} onChange={(e) => setEditPin(e.target.value)} />
            {editAssignmentIsActuator ? (
              <Text size="1" color="gray">
                Este componente es un actuador de salida; no captura parametros. Solo se edita el GPIO del rele.
              </Text>
            ) : (
              <SearchableSelect
                value={editMetricId}
                onValueChange={setEditMetricId}
                placeholder="Parametro de captura"
                searchPlaceholder="Buscar parametro..."
                options={metricas.map((m: any) => ({ value: m.id.toString(), label: `${m.nombre} (${m.codigo})` }))}
              />
            )}
            {showEditWaterSource && (
              editWaterSources.length > 0 ? (
                <SearchableSelect
                  value={editFuenteAguaId}
                  onValueChange={setEditFuenteAguaId}
                  placeholder="Tanque / fuente de agua opcional"
                  searchPlaceholder="Buscar fuente..."
                  options={editWaterSources.map((f: any) => ({ value: f.id.toString(), label: f.nombre }))}
                />
              ) : (
                <Text size="2" color="gray">{WATER_SOURCE_EMPTY_MESSAGE}</Text>
              )
            )}
          </Flex>
          <Flex gap="3" mt="6" justify="end">
            <Dialog.Close><Button variant="soft" color="gray">Cancelar</Button></Dialog.Close>
            <Button color="green" onClick={handleUpdateAssignment}>Guardar cambios</Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
}
