"use client";

import React, { useState, useTransition } from "react";
import { Badge, Box, Button, Card, Dialog, Flex, Grid, ScrollArea, Select, Tabs, Text, TextField } from "@radix-ui/themes";
import { Gauge, MapPin, Plus, Tag } from "lucide-react";
import { actualizarParametrosPlanta, registrarDistrito, registrarPlanta, registrarProvincia, registrarRegion } from "@/actions/admin";

type RangoParametro = {
  minimo: string;
  maximo: string;
};

type ItemCatalogo = { id: number; nombre: string };
type PlantaCatalogo = ItemCatalogo & { tipo?: string; descripcion?: string; umbrales?: Umbral[] };
type Metrica = ItemCatalogo & { codigo?: string; unidad?: string };
type Umbral = {
  id_tipo_metrica: number;
  valor_minimo: number | null;
  valor_maximo: number | null;
};
type CatalogoClientProps = {
  catalogPlantas?: PlantaCatalogo[];
  regiones?: ItemCatalogo[];
  provincias?: ItemCatalogo[];
  distritos?: ItemCatalogo[];
  metricas?: Metrica[];
};

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : "Ocurrió un error inesperado";

export default function CatalogoClient({ catalogPlantas = [], regiones = [], provincias = [], distritos = [], metricas = [] }: CatalogoClientProps) {
  const metricasPlanta = metricas.filter((metrica) => !["NIVEL_AGUA", "BAT_PCT"].includes(metrica.codigo ?? ""));
  const idsMetricasPlanta = new Set(metricasPlanta.map((metrica) => metrica.id));
  const [isPending, startTransition] = useTransition();
  const [isOpenRegisterPlant, setIsOpenRegisterPlant] = useState(false);
  const [plantEditing, setPlantEditing] = useState<PlantaCatalogo | null>(null);
  const [isOpenRegisterGeo, setIsOpenRegisterGeo] = useState(false);
  const [newPlantNombre, setNewPlantNombre] = useState("");
  const [newPlantTipo, setNewPlantTipo] = useState("");
  const [newPlantDesc, setNewPlantDesc] = useState("");
  const [newPlantParametros, setNewPlantParametros] = useState<Record<number, RangoParametro>>({});
  const [editPlantParametros, setEditPlantParametros] = useState<Record<number, RangoParametro>>({});
  const [newGeoLevel, setNewGeoLevel] = useState("departamento");
  const [newRegionNombre, setNewRegionNombre] = useState("");
  const [selectedRegionId, setSelectedRegionId] = useState("");
  const [newProvinciaNombre, setNewProvinciaNombre] = useState("");
  const [selectedProvinciaId, setSelectedProvinciaId] = useState("");
  const [newDistritoNombre, setNewDistritoNombre] = useState("");

  const handleRegisterPlantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlantNombre) return;

    const umbrales: Umbral[] = metricasPlanta.flatMap((metrica) => {
      const rango = newPlantParametros[metrica.id];
      if (!rango || (!rango.minimo.trim() && !rango.maximo.trim())) return [];

      return [{
        id_tipo_metrica: metrica.id,
        valor_minimo: rango.minimo.trim() ? Number(rango.minimo) : null,
        valor_maximo: rango.maximo.trim() ? Number(rango.maximo) : null,
      }];
    });

    const rangoInvalido = umbrales.some((umbral) =>
      (umbral.valor_minimo !== null && !Number.isFinite(umbral.valor_minimo)) ||
      (umbral.valor_maximo !== null && !Number.isFinite(umbral.valor_maximo)) ||
      (umbral.valor_minimo !== null && umbral.valor_maximo !== null && umbral.valor_minimo > umbral.valor_maximo)
    );
    if (rangoInvalido) {
      alert("Revisa los parámetros: los valores deben ser numéricos y el mínimo no puede superar al máximo.");
      return;
    }

    startTransition(async () => {
      try {
        await registrarPlanta(newPlantNombre, newPlantTipo, newPlantDesc, umbrales);
        window.location.reload();
      } catch (err: unknown) {
        alert(`Error: ${getErrorMessage(err)}`);
      }
    });
  };

  const updatePlantParametro = (metricaId: number, campo: keyof RangoParametro, valor: string) => {
    setNewPlantParametros((actuales) => ({
      ...actuales,
      [metricaId]: {
        minimo: actuales[metricaId]?.minimo ?? "",
        maximo: actuales[metricaId]?.maximo ?? "",
        [campo]: valor,
      },
    }));
  };

  const openPlantParametros = (planta: PlantaCatalogo) => {
    const actuales = Object.fromEntries((planta.umbrales ?? []).map((umbral) => [
      umbral.id_tipo_metrica,
      {
        minimo: umbral.valor_minimo?.toString() ?? "",
        maximo: umbral.valor_maximo?.toString() ?? "",
      },
    ]));
    setEditPlantParametros(actuales);
    setPlantEditing(planta);
  };

  const updateEditPlantParametro = (metricaId: number, campo: keyof RangoParametro, valor: string) => {
    setEditPlantParametros((actuales) => ({
      ...actuales,
      [metricaId]: {
        minimo: actuales[metricaId]?.minimo ?? "",
        maximo: actuales[metricaId]?.maximo ?? "",
        [campo]: valor,
      },
    }));
  };

  const handleUpdatePlantParametros = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plantEditing) return;

    const umbrales: Umbral[] = metricasPlanta.flatMap((metrica) => {
      const rango = editPlantParametros[metrica.id];
      if (!rango || (!rango.minimo.trim() && !rango.maximo.trim())) return [];
      return [{
        id_tipo_metrica: metrica.id,
        valor_minimo: rango.minimo.trim() ? Number(rango.minimo) : null,
        valor_maximo: rango.maximo.trim() ? Number(rango.maximo) : null,
      }];
    });

    const rangoInvalido = umbrales.some((umbral) =>
      (umbral.valor_minimo !== null && !Number.isFinite(umbral.valor_minimo)) ||
      (umbral.valor_maximo !== null && !Number.isFinite(umbral.valor_maximo)) ||
      (umbral.valor_minimo !== null && umbral.valor_maximo !== null && umbral.valor_minimo > umbral.valor_maximo)
    );
    if (rangoInvalido) {
      alert("Revisa los parámetros: los valores deben ser numéricos y el mínimo no puede superar al máximo.");
      return;
    }

    startTransition(async () => {
      try {
        await actualizarParametrosPlanta(plantEditing.id, umbrales);
        window.location.reload();
      } catch (err: unknown) {
        alert(`Error: ${getErrorMessage(err)}`);
      }
    });
  };

  const handleRegisterRegionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegionNombre) return;
    startTransition(async () => {
      try {
        await registrarRegion(newRegionNombre);
        window.location.reload();
      } catch (err: unknown) {
        alert(`Error: ${getErrorMessage(err)}`);
      }
    });
  };

  const handleRegisterProvinciaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegionId || !newProvinciaNombre) return;
    startTransition(async () => {
      try {
        await registrarProvincia(parseInt(selectedRegionId, 10), newProvinciaNombre);
        window.location.reload();
      } catch (err: unknown) {
        alert(`Error: ${getErrorMessage(err)}`);
      }
    });
  };

  const handleRegisterDistritoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvinciaId || !newDistritoNombre) return;
    startTransition(async () => {
      try {
        await registrarDistrito(parseInt(selectedProvinciaId, 10), newDistritoNombre);
        window.location.reload();
      } catch (err: unknown) {
        alert(`Error: ${getErrorMessage(err)}`);
      }
    });
  };

  return (
    <Box style={{ opacity: isPending ? 0.6 : 1, transition: "opacity 0.2s" }}>
      <Flex direction="column" gap="4" mb="6">
        <Box>
          <Text size="6" weight="bold" color="indigo" as="div">Catalogo</Text>
          <Text size="2" color="gray" style={{ fontFamily: "monospace" }}>Administra plantas y ubicaciones geograficas.</Text>
        </Box>
      </Flex>

      <Flex gap="3" mb="4">
        <Button color="indigo" onClick={() => setIsOpenRegisterPlant(true)} style={{ cursor: "pointer" }}>
          <Plus size={16} style={{ marginRight: "4px" }} /> Registrar Planta
        </Button>
        <Button color="teal" onClick={() => setIsOpenRegisterGeo(true)} style={{ cursor: "pointer" }}>
          <MapPin size={16} style={{ marginRight: "4px" }} /> Registrar Ubicacion
        </Button>
      </Flex>

      <Grid columns={{ initial: "1", lg: "2" }} gap="5">
        <Card size="3" style={{ background: "var(--surface-mockup)", borderColor: "var(--border-mockup)", borderRadius: "16px" }}>
          <Flex align="center" gap="2" mb="4">
            <Tag size={20} color="#818cf8" />
            <Text size="4" weight="bold" color="indigo">Catalogo Botanico</Text>
          </Flex>
          <Text size="2" color="gray" mb="3" as="div" style={{ fontWeight: "bold" }}>Especies Registradas ({catalogPlantas.length})</Text>
          <ScrollArea style={{ height: 350 }}>
            <Grid columns={{ initial: "1", md: "2" }} gap="2">
              {catalogPlantas.map((p) => (
                <Card key={p.id} style={{ background: "var(--surface2-mockup)", borderColor: "var(--border-mockup)" }}>
                  <Flex justify="between" align="start" gap="2">
                    <Box>
                      <Text size="2" weight="bold" style={{ color: "white" }}>{p.nombre}</Text>
                      {p.tipo && <Badge color="indigo" size="1" ml="2">{p.tipo}</Badge>}
                    </Box>
                    <Button
                      type="button"
                      size="1"
                      variant="soft"
                      color="indigo"
                      aria-label={`Agregar o modificar parámetros de ${p.nombre}`}
                      title="Agregar o modificar parámetros"
                      onClick={() => openPlantParametros(p)}
                      style={{ cursor: "pointer", flexShrink: 0 }}
                    >
                      <Plus size={15} />
                    </Button>
                  </Flex>
                  <Text size="1" color="gray" style={{ display: "block", marginTop: "2px" }}>{p.descripcion || "Sin descripcion"}</Text>
                  <Text size="1" color="indigo" style={{ display: "block", marginTop: "5px" }}>
                    {p.umbrales?.filter((umbral) => idsMetricasPlanta.has(umbral.id_tipo_metrica)).length ?? 0} parámetros configurados
                  </Text>
                </Card>
              ))}
            </Grid>
          </ScrollArea>
        </Card>

        <Card size="3" style={{ background: "var(--surface-mockup)", borderColor: "var(--border-mockup)", borderRadius: "16px" }}>
          <Flex align="center" gap="2" mb="4">
            <MapPin size={20} color="#f87171" />
            <Text size="4" weight="bold" color="indigo">Divisiones Geograficas</Text>
          </Flex>
          <Tabs.Root defaultValue="reg">
            <Tabs.List size="2" style={{ marginBottom: "16px" }}>
              <Tabs.Trigger value="reg">Departamentos ({regiones.length})</Tabs.Trigger>
              <Tabs.Trigger value="prov">Provincias ({provincias.length})</Tabs.Trigger>
              <Tabs.Trigger value="dist">Distritos ({distritos.length})</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="reg">
              <ScrollArea style={{ height: 280 }}>
                <Grid columns={{ initial: "1", sm: "2", md: "3" }} gap="2">
                  {regiones.map((r) => <Card key={r.id} style={{ background: "var(--surface2-mockup)", borderColor: "var(--border-mockup)" }}><Text size="2" weight="bold" style={{ color: "white" }}>{r.nombre}</Text></Card>)}
                </Grid>
              </ScrollArea>
            </Tabs.Content>
            <Tabs.Content value="prov">
              <ScrollArea style={{ height: 280 }}>
                <Grid columns={{ initial: "1", sm: "2", md: "3" }} gap="2">
                  {provincias.map((p) => <Card key={p.id} style={{ background: "var(--surface2-mockup)", borderColor: "var(--border-mockup)" }}><Text size="2" weight="bold" style={{ color: "white" }}>{p.nombre}</Text></Card>)}
                </Grid>
              </ScrollArea>
            </Tabs.Content>
            <Tabs.Content value="dist">
              <ScrollArea style={{ height: 280 }}>
                <Grid columns={{ initial: "1", sm: "2", md: "3" }} gap="2">
                  {distritos.map((d) => <Card key={d.id} style={{ background: "var(--surface2-mockup)", borderColor: "var(--border-mockup)" }}><Text size="2" weight="bold" style={{ color: "white" }}>{d.nombre}</Text></Card>)}
                </Grid>
              </ScrollArea>
            </Tabs.Content>
          </Tabs.Root>
        </Card>
      </Grid>

      <Dialog.Root open={isOpenRegisterPlant} onOpenChange={setIsOpenRegisterPlant}>
        <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 620, background: "var(--surface-mockup)", border: "1px solid var(--border-mockup)" }}>
          <Dialog.Title style={{ color: "white" }}>Registrar Especie de Planta</Dialog.Title>
          <form onSubmit={handleRegisterPlantSubmit}>
            <Flex direction="column" gap="3" mt="3">
              <TextField.Root placeholder="Nombre de la especie" value={newPlantNombre} onChange={(e) => setNewPlantNombre(e.target.value)} />
              <TextField.Root placeholder="Tipo / categoria" value={newPlantTipo} onChange={(e) => setNewPlantTipo(e.target.value)} />
              <TextField.Root placeholder="Descripcion" value={newPlantDesc} onChange={(e) => setNewPlantDesc(e.target.value)} />
              <Box mt="2">
                <Flex align="center" gap="2" mb="1">
                  <Gauge size={17} color="#818cf8" />
                  <Text size="3" weight="bold" style={{ color: "white" }}>Parámetros recomendados</Text>
                </Flex>
                <Text size="1" color="gray" as="div" mb="3">
                  Ingresa el rango mínimo y máximo recomendado para la planta. Puedes dejar un parámetro vacío.
                </Text>
                {metricasPlanta.length > 0 ? (
                  <ScrollArea style={{ maxHeight: 260 }}>
                    <Flex direction="column" gap="2" pr="2">
                      {metricasPlanta.map((metrica) => (
                        <Card key={metrica.id} size="1" style={{ background: "var(--surface2-mockup)", borderColor: "var(--border-mockup)" }}>
                          <Grid columns={{ initial: "1", sm: "minmax(150px, 1fr) 1fr 1fr" }} gap="2" align="center">
                            <Box>
                              <Text size="2" weight="bold" style={{ color: "white" }}>{metrica.nombre}</Text>
                              <Text size="1" color="gray" as="div">{metrica.unidad || "Sin unidad"}</Text>
                            </Box>
                            <TextField.Root
                              type="number"
                              step="any"
                              placeholder={`Mínimo${metrica.unidad ? ` (${metrica.unidad})` : ""}`}
                              aria-label={`Valor mínimo de ${metrica.nombre}`}
                              value={newPlantParametros[metrica.id]?.minimo ?? ""}
                              onChange={(e) => updatePlantParametro(metrica.id, "minimo", e.target.value)}
                            />
                            <TextField.Root
                              type="number"
                              step="any"
                              placeholder={`Máximo${metrica.unidad ? ` (${metrica.unidad})` : ""}`}
                              aria-label={`Valor máximo de ${metrica.nombre}`}
                              value={newPlantParametros[metrica.id]?.maximo ?? ""}
                              onChange={(e) => updatePlantParametro(metrica.id, "maximo", e.target.value)}
                            />
                          </Grid>
                        </Card>
                      ))}
                    </Flex>
                  </ScrollArea>
                ) : (
                  <Text size="2" color="gray">No hay tipos de métrica disponibles.</Text>
                )}
              </Box>
            </Flex>
            <Flex gap="3" mt="6" justify="end">
              <Dialog.Close><Button variant="soft" color="gray">Cancelar</Button></Dialog.Close>
              <Button type="submit" color="green" disabled={!newPlantNombre || !newPlantTipo}>Agregar Planta</Button>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={plantEditing !== null} onOpenChange={(open) => !open && setPlantEditing(null)}>
        <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 620, background: "var(--surface-mockup)", border: "1px solid var(--border-mockup)" }}>
          <Dialog.Title style={{ color: "white" }}>Parámetros de {plantEditing?.nombre}</Dialog.Title>
          <Text size="2" color="gray" as="div" mt="1" mb="3">
            Modifica los rangos existentes o completa uno nuevo. Deja ambos campos vacíos para quitar un parámetro.
          </Text>
          <form onSubmit={handleUpdatePlantParametros}>
            {metricasPlanta.length > 0 ? (
              <ScrollArea style={{ maxHeight: 360 }}>
                <Flex direction="column" gap="2" pr="2">
                  {metricasPlanta.map((metrica) => (
                    <Card key={metrica.id} size="1" style={{ background: "var(--surface2-mockup)", borderColor: "var(--border-mockup)" }}>
                      <Grid columns={{ initial: "1", sm: "minmax(150px, 1fr) 1fr 1fr" }} gap="2" align="center">
                        <Box>
                          <Text size="2" weight="bold" style={{ color: "white" }}>{metrica.nombre}</Text>
                          <Text size="1" color="gray" as="div">{metrica.unidad || "Sin unidad"}</Text>
                        </Box>
                        <TextField.Root
                          type="number"
                          step="any"
                          placeholder="Mínimo"
                          aria-label={`Valor mínimo de ${metrica.nombre}`}
                          value={editPlantParametros[metrica.id]?.minimo ?? ""}
                          onChange={(e) => updateEditPlantParametro(metrica.id, "minimo", e.target.value)}
                        />
                        <TextField.Root
                          type="number"
                          step="any"
                          placeholder="Máximo"
                          aria-label={`Valor máximo de ${metrica.nombre}`}
                          value={editPlantParametros[metrica.id]?.maximo ?? ""}
                          onChange={(e) => updateEditPlantParametro(metrica.id, "maximo", e.target.value)}
                        />
                      </Grid>
                    </Card>
                  ))}
                </Flex>
              </ScrollArea>
            ) : (
              <Text size="2" color="gray">No hay tipos de métrica disponibles.</Text>
            )}
            <Flex gap="3" mt="6" justify="end">
              <Dialog.Close><Button type="button" variant="soft" color="gray">Cancelar</Button></Dialog.Close>
              <Button type="submit" color="green" disabled={metricasPlanta.length === 0}>Guardar parámetros</Button>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={isOpenRegisterGeo} onOpenChange={setIsOpenRegisterGeo}>
        <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 480, background: "var(--surface-mockup)", border: "1px solid var(--border-mockup)" }}>
          <Dialog.Title style={{ color: "white" }}>Registrar Ubicacion Geografica</Dialog.Title>
          <Flex direction="column" gap="3" mt="3">
            <Select.Root value={newGeoLevel} onValueChange={setNewGeoLevel}>
              <Select.Trigger />
              <Select.Content>
                <Select.Item value="departamento">Departamento</Select.Item>
                <Select.Item value="provincia">Provincia</Select.Item>
                <Select.Item value="distrito">Distrito</Select.Item>
              </Select.Content>
            </Select.Root>
            {newGeoLevel === "departamento" && (
              <form onSubmit={handleRegisterRegionSubmit}>
                <Flex direction="column" gap="3"><TextField.Root placeholder="Nombre del departamento" value={newRegionNombre} onChange={(e) => setNewRegionNombre(e.target.value)} /><Button type="submit" color="green" disabled={!newRegionNombre}>Registrar</Button></Flex>
              </form>
            )}
            {newGeoLevel === "provincia" && (
              <form onSubmit={handleRegisterProvinciaSubmit}>
                <Flex direction="column" gap="3">
                  <Select.Root value={selectedRegionId} onValueChange={setSelectedRegionId}><Select.Trigger placeholder="Departamento" /><Select.Content>{regiones.map((r) => <Select.Item key={r.id} value={r.id.toString()}>{r.nombre}</Select.Item>)}</Select.Content></Select.Root>
                  <TextField.Root placeholder="Nombre de la provincia" value={newProvinciaNombre} onChange={(e) => setNewProvinciaNombre(e.target.value)} disabled={!selectedRegionId} />
                  <Button type="submit" color="green" disabled={!selectedRegionId || !newProvinciaNombre}>Registrar</Button>
                </Flex>
              </form>
            )}
            {newGeoLevel === "distrito" && (
              <form onSubmit={handleRegisterDistritoSubmit}>
                <Flex direction="column" gap="3">
                  <Select.Root value={selectedProvinciaId} onValueChange={setSelectedProvinciaId}><Select.Trigger placeholder="Provincia" /><Select.Content>{provincias.map((p) => <Select.Item key={p.id} value={p.id.toString()}>{p.nombre}</Select.Item>)}</Select.Content></Select.Root>
                  <TextField.Root placeholder="Nombre del distrito" value={newDistritoNombre} onChange={(e) => setNewDistritoNombre(e.target.value)} disabled={!selectedProvinciaId} />
                  <Button type="submit" color="green" disabled={!selectedProvinciaId || !newDistritoNombre}>Registrar</Button>
                </Flex>
              </form>
            )}
          </Flex>
          <Flex gap="3" mt="6" justify="end"><Dialog.Close><Button variant="soft" color="gray">Cerrar</Button></Dialog.Close></Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
}
