"use client";

import React, { useState, useTransition } from "react";
import { Badge, Box, Button, Card, Flex, Grid, ScrollArea, Table, Text, TextField } from "@radix-ui/themes";
import { Plus, Warehouse } from "lucide-react";
import { eliminarAlmacen, registrarAlmacen } from "@/actions/almacenes";
import SearchableSelect from "@/components/ui/SearchableSelect";

export default function AlmacenesClient({ initialAlmacenes = [], initialDevices = [], regiones = [], provincias = [], distritos = [] }: any) {
  const [almacenesList] = useState(initialAlmacenes);
  const [isPending, startTransition] = useTransition();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(almacenesList.length / pageSize));
  const paginatedAlmacenes = almacenesList.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const [newAlmacenNombre, setNewAlmacenNombre] = useState("");
  const [newAlmacenRegionId, setNewAlmacenRegionId] = useState("");
  const [newAlmacenProvinciaId, setNewAlmacenProvinciaId] = useState("");
  const [newAlmacenDistritoId, setNewAlmacenDistritoId] = useState("");
  const [newAlmacenDireccion, setNewAlmacenDireccion] = useState("");

  const filteredProvincias = provincias.filter((p: any) => p.id_region.toString() === newAlmacenRegionId);
  const filteredDistritos = distritos.filter((d: any) => d.id_provincia.toString() === newAlmacenProvinciaId);

  const getLocationString = (idDistrito: number) => {
    const dist = distritos.find((d: any) => d.id === idDistrito);
    if (!dist) return `Distrito #${idDistrito}`;
    const prov = provincias.find((p: any) => p.id === dist.id_provincia);
    if (!prov) return dist.nombre;
    const reg = regiones.find((r: any) => r.id === prov.id_region);
    return reg ? `${dist.nombre}, ${prov.nombre} (${reg.nombre})` : `${dist.nombre}, ${prov.nombre}`;
  };

  const handleRegisterAlmacenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlmacenNombre || !newAlmacenDistritoId) return;
    startTransition(async () => {
      try {
        const res = await registrarAlmacen({
          nombre: newAlmacenNombre,
          id_distrito: parseInt(newAlmacenDistritoId, 10),
          direccion: newAlmacenDireccion || undefined,
        });
        if (res.id) window.location.reload();
      } catch (err: any) {
        alert(`Error al registrar almacen: ${err.message}`);
      }
    });
  };

  const handleDeleteAlmacen = async (idAlmacen: number, nombre: string) => {
    if (!confirm(`Seguro que desea eliminar el almacen '${nombre}'?`)) return;
    startTransition(async () => {
      try {
        const res = await eliminarAlmacen(idAlmacen);
        if (res.status === "ok") window.location.reload();
      } catch (err: any) {
        alert(`Error al eliminar almacen: ${err.message}`);
      }
    });
  };

  return (
    <Box style={{ opacity: isPending ? 0.6 : 1, transition: "opacity 0.2s" }}>
      <Flex direction="column" gap="4" mb="5">
        <Box>
          <Text size={{ initial: "5", sm: "6" }} weight="bold" color="indigo" as="div">Almacenes</Text>
          <Text size={{ initial: "1", sm: "2" }} color="gray" style={{ fontFamily: "monospace" }}>Gestiona ubicaciones físicas e inventario.</Text>
        </Box>
      </Flex>

      <Grid columns={{ initial: "1", lg: "3" }} gap="5">
        <Card size={{ initial: "2", sm: "3" }} style={{ background: "var(--surface-mockup)", borderColor: "var(--border-mockup)", borderRadius: "16px" }}>
          <Flex align="center" gap="2" mb="4">
            <Plus size={20} color="#818cf8" />
            <Text size={{ initial: "3", sm: "4" }} weight="bold" color="indigo" as="div">Registrar Nuevo Almacén</Text>
          </Flex>
          <form onSubmit={handleRegisterAlmacenSubmit}>
            <Flex direction="column" gap="3">
              <TextField.Root placeholder="Nombre del almacen" value={newAlmacenNombre} onChange={(e) => setNewAlmacenNombre(e.target.value)} required />
              <SearchableSelect
                value={newAlmacenRegionId}
                onValueChange={(val) => { setNewAlmacenRegionId(val); setNewAlmacenProvinciaId(""); setNewAlmacenDistritoId(""); }}
                placeholder="Region"
                searchPlaceholder="Buscar region..."
                options={regiones.map((reg: any) => ({ value: reg.id.toString(), label: reg.nombre }))}
              />
              <SearchableSelect
                value={newAlmacenProvinciaId}
                onValueChange={(val) => { setNewAlmacenProvinciaId(val); setNewAlmacenDistritoId(""); }}
                disabled={!newAlmacenRegionId}
                placeholder="Provincia"
                searchPlaceholder="Buscar provincia..."
                options={filteredProvincias.map((prov: any) => ({ value: prov.id.toString(), label: prov.nombre }))}
              />
              <SearchableSelect
                value={newAlmacenDistritoId}
                onValueChange={setNewAlmacenDistritoId}
                disabled={!newAlmacenProvinciaId}
                placeholder="Distrito"
                searchPlaceholder="Buscar distrito..."
                options={filteredDistritos.map((dist: any) => ({ value: dist.id.toString(), label: dist.nombre }))}
              />
              <TextField.Root placeholder="Direccion fisica" value={newAlmacenDireccion} onChange={(e) => setNewAlmacenDireccion(e.target.value)} />
              <Button type="submit" color="indigo" mt="3" disabled={!newAlmacenNombre || !newAlmacenDistritoId}>Crear Almacen</Button>
            </Flex>
          </form>
        </Card>

        <Box className="col-span-1 lg:col-span-2">
          <Card size={{ initial: "2", sm: "3" }} style={{ background: "var(--surface-mockup)", borderColor: "var(--border-mockup)", borderRadius: "16px" }}>
            <Flex align="center" gap="2" mb="4">
              <Warehouse size={20} color="#34d399" />
              <Text size={{ initial: "3", sm: "4" }} weight="bold" color="indigo" as="div">Almacenes y Stock Físico</Text>
            </Flex>
            <ScrollArea scrollbars="horizontal" style={{ width: "100%" }}>
              <Table.Root variant="surface" style={{ background: "transparent", minWidth: "500px" }}>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Nombre</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Ubicacion</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Direccion</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Stock</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Acciones</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {paginatedAlmacenes.map((alm: any) => {
                    const deviceCount = initialDevices.filter((d: any) => d.id_almacen === alm.id && d.estado === "disponible").length;
                    return (
                      <Table.Row key={alm.id}>
                        <Table.RowHeaderCell><Text size="2" weight="bold" style={{ color: "white" }}>{alm.nombre}</Text></Table.RowHeaderCell>
                        <Table.Cell><Text size="2" style={{ color: "#e2e8f0" }}>{getLocationString(alm.id_distrito)}</Text></Table.Cell>
                        <Table.Cell><Text size="2" style={{ color: "#94a3b8" }}>{alm.direccion || "-"}</Text></Table.Cell>
                        <Table.Cell><Badge color={deviceCount > 0 ? "green" : "gray"} variant="soft">{deviceCount} unidades</Badge></Table.Cell>
                        <Table.Cell><Button size="1" color="red" variant="soft" onClick={() => handleDeleteAlmacen(alm.id, alm.nombre)}>Eliminar</Button></Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table.Root>
            </ScrollArea>

            {almacenesList.length > pageSize && (
              <Flex justify="between" align="center" mt="4" px="2">
                <Text size="2" color="gray">
                  Mostrando {Math.min((currentPage - 1) * pageSize + 1, almacenesList.length)} a {Math.min(currentPage * pageSize, almacenesList.length)} de {almacenesList.length}
                </Text>
                <Flex gap="1">
                  <Button size="1" variant="soft" color="gray" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>Anterior</Button>
                  <Button size="1" variant="soft" color="gray" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Siguiente</Button>
                </Flex>
              </Flex>
            )}
          </Card>
        </Box>
      </Grid>
    </Box>
  );
}
