"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { Badge, Box, Button, Card, Dialog, Flex, ScrollArea, Table, Text, TextField } from "@radix-ui/themes";
import { Eye, EyeOff, KeyRound, Search } from "lucide-react";
import { HelpNote, IconTile } from "@/components/ui/yaku-ui";
import {
  CredencialDispositivo,
  eliminarCredencialMqtt,
  guardarCredencialMqtt,
  listarCredencialesMqtt,
} from "@/actions/mqttConfig";

// Mismas reglas que el backend (CredencialDispositivoGuardar).
const PATRON_USUARIO = /^[A-Za-z0-9_.@:-]+$/;
const CLAVE_MIN = 8;
const CLAVE_MAX = 100;
const PAGE_SIZE = 10;

const inputStyle = { background: "var(--surface2-mockup)", border: "1px solid var(--border-mockup)" };

function validar(username: string, password: string, confirmacion: string, esNueva: boolean): string | null {
  if (username.length < 3 || username.length > 150) return "El usuario MQTT debe tener entre 3 y 150 caracteres.";
  if (!PATRON_USUARIO.test(username)) return "El usuario MQTT solo admite letras, números y los caracteres _ . @ : -";
  if (esNueva && !password) return "La contraseña es obligatoria al registrar la credencial.";
  if (password && (password.length < CLAVE_MIN || password.length > CLAVE_MAX)) {
    return `La contraseña debe tener entre ${CLAVE_MIN} y ${CLAVE_MAX} caracteres.`;
  }
  if (password !== confirmacion) return "Las contraseñas no coinciden.";
  return null;
}

export default function MqttCredencialesDispositivos() {
  const [filas, setFilas] = useState<CredencialDispositivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);

  const [editando, setEditando] = useState<CredencialDispositivo | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    const res = await listarCredencialesMqtt();
    setLoading(false);
    if (res.success) {
      setFilas(res.data);
      setError(null);
    } else {
      setError(res.error);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return filas;
    return filas.filter((f) =>
      [f.nombre, f.client_id_mqtt, f.tipo, f.username].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [filas, busqueda]);
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtradas.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);
  const registradas = filas.filter((f) => f.tiene_credencial).length;

  const abrirFormulario = (fila: CredencialDispositivo) => {
    setEditando(fila);
    // Al registrar se sugiere el client_id del equipo: facilita reconocerlo en el broker.
    setUsername(fila.username || fila.client_id_mqtt || "");
    setPassword("");
    setConfirmacion("");
    setVerClave(false);
    setFormError(null);
  };

  const handleGuardar = async (e: FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    const usuario = username.trim();
    const problema = validar(usuario, password, confirmacion, !editando.tiene_credencial);
    if (problema) {
      setFormError(problema);
      return;
    }
    setGuardando(true);
    const res = await guardarCredencialMqtt(editando.id_dispositivo, { username: usuario, password });
    setGuardando(false);
    if (!res.success) {
      setFormError(res.error);
      return;
    }
    setFilas((actuales) => actuales.map((f) => (f.id_dispositivo === res.data.id_dispositivo ? res.data : f)));
    setEditando(null);
  };

  const handleEliminar = async (fila: CredencialDispositivo) => {
    const ok = confirm(
      `¿Eliminar la credencial MQTT de "${fila.nombre}"?\n\n` +
        "El equipo no podrá volver a aprovisionarse hasta registrar otra. Revoque también " +
        `el usuario "${fila.username}" en el broker para que deje de conectarse.`,
    );
    if (!ok) return;
    const res = await eliminarCredencialMqtt(fila.id_dispositivo);
    if (!res.success) {
      alert(res.error);
      return;
    }
    setFilas((actuales) =>
      actuales.map((f) =>
        f.id_dispositivo === fila.id_dispositivo
          ? { ...f, username: null, tiene_credencial: false, fecha_actualizacion: null }
          : f,
      ),
    );
  };

  return (
    <Card
      size={{ initial: "2", sm: "3" }}
      mt="4"
      style={{ background: "var(--surface-mockup)", borderColor: "var(--border-mockup)", borderRadius: "16px" }}
    >
      <Flex direction="column" gap="4">
        <Flex align="center" justify="between" gap="3" wrap="wrap">
          <Flex align="center" gap="3">
            <IconTile icon={KeyRound} t="amber" size={40} />
            <Box>
              <Text weight="bold" style={{ color: "white" }} as="div">Credenciales de dispositivos</Text>
              <Text size="1" color="gray">
                {loading ? "Cargando..." : `${registradas} de ${filas.length} dispositivos con credencial propia`}
              </Text>
            </Box>
          </Flex>
          <TextField.Root
            placeholder="Buscar dispositivo o usuario"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            style={{ ...inputStyle, minWidth: 220 }}
            aria-label="Buscar dispositivo o usuario MQTT"
          >
            <TextField.Slot><Search size={14} /></TextField.Slot>
          </TextField.Root>
        </Flex>

        <HelpNote title="¿Cómo registro la credencial de un dispositivo?">
          <p>
            Cada ESP32 se conecta al broker con su propio usuario. Así, si un equipo se pierde o se da de baja, se
            revoca solo su credencial y los demás siguen funcionando.
          </p>
          <p>
            1. En el broker (HiveMQ Cloud &gt; Gestión de acceso) cree una credencial con permiso{" "}
            <strong>Publicar y suscribirse</strong>. 2. Regístrela aquí con el mismo usuario y contraseña. 3. En{" "}
            <strong>Firmware</strong>, al configurar el equipo, la credencial se completa sola.
          </p>
          <p>
            La contraseña se guarda cifrada y no se vuelve a mostrar. Al modificar, deje la contraseña vacía para
            conservar la actual.
          </p>
        </HelpNote>

        {error && (
          <Box p="2" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px" }}>
            <Text color="red" size="1">{error}</Text>
          </Box>
        )}

        {!loading && !error && (
          <ScrollArea scrollbars="horizontal" style={{ width: "100%" }}>
            <Table.Root variant="surface" style={{ background: "transparent", minWidth: "680px" }}>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Dispositivo</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Client ID</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Usuario MQTT</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Estado</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Actualizada</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Acciones</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {visibles.length === 0 && (
                  <Table.Row>
                    <Table.Cell colSpan={6}>
                      <Text size="2" color="gray">
                        {filas.length === 0 ? "No hay dispositivos registrados." : "Ningún dispositivo coincide con la búsqueda."}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                )}
                {visibles.map((fila) => (
                  <Table.Row key={fila.id_dispositivo}>
                    <Table.RowHeaderCell>
                      <Text size="2" weight="bold" style={{ color: "white" }} as="div">{fila.nombre}</Text>
                      {fila.tipo && <Text size="1" color="gray">{fila.tipo}</Text>}
                    </Table.RowHeaderCell>
                    <Table.Cell>
                      <Text size="1" style={{ color: "#94a3b8", fontFamily: "var(--font-mono)" }}>
                        {fila.client_id_mqtt || "—"}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="2" style={{ color: "#e2e8f0", fontFamily: "var(--font-mono)" }}>{fila.username || "—"}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={fila.tiene_credencial ? "green" : "amber"} variant="soft">
                        {fila.tiene_credencial ? "Registrada" : "Sin credencial"}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="1" color="gray">
                        {fila.fecha_actualizacion ? new Date(fila.fecha_actualizacion + "Z").toLocaleString() : "—"}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Flex gap="2">
                        <Button size="1" variant="soft" onClick={() => abrirFormulario(fila)} style={{ cursor: "pointer" }}>
                          {fila.tiene_credencial ? "Modificar" : "Registrar"}
                        </Button>
                        {fila.tiene_credencial && (
                          <Button size="1" color="red" variant="soft" onClick={() => handleEliminar(fila)} style={{ cursor: "pointer" }}>
                            Eliminar
                          </Button>
                        )}
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </ScrollArea>
        )}

        {filtradas.length > PAGE_SIZE && (
          <Flex justify="between" align="center" px="2">
            <Text size="2" color="gray">
              Mostrando {(paginaActual - 1) * PAGE_SIZE + 1} a {Math.min(paginaActual * PAGE_SIZE, filtradas.length)} de {filtradas.length}
            </Text>
            <Flex gap="1">
              <Button size="1" variant="soft" color="gray" onClick={() => setPagina(paginaActual - 1)} disabled={paginaActual === 1}>Anterior</Button>
              <Button size="1" variant="soft" color="gray" onClick={() => setPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas}>Siguiente</Button>
            </Flex>
          </Flex>
        )}
      </Flex>

      <Dialog.Root open={editando !== null} onOpenChange={(open) => !open && setEditando(null)}>
        <Dialog.Content
          aria-describedby={undefined}
          style={{ maxWidth: 480, width: "92vw", background: "var(--surface-mockup)", border: "1px solid var(--border-mockup)" }}
        >
          <Dialog.Title style={{ color: "white" }}>
            {editando?.tiene_credencial ? "Modificar credencial MQTT" : "Registrar credencial MQTT"}
          </Dialog.Title>
          <Text size="2" color="gray" as="div" mb="3">
            {editando?.nombre}
            {editando?.client_id_mqtt && (
              <span style={{ fontFamily: "var(--font-mono)", marginLeft: 6 }}>· {editando.client_id_mqtt}</span>
            )}
          </Text>
          <form onSubmit={handleGuardar}>
            <Flex direction="column" gap="3">
              <Box>
                <Text as="label" htmlFor="mqtt-cred-usuario" size="1" color="gray" mb="1" style={{ display: "block" }}>
                  Usuario MQTT (igual que en el broker)
                </Text>
                <TextField.Root
                  id="mqtt-cred-usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="off"
                  style={inputStyle}
                />
              </Box>
              <Box>
                <Text as="label" htmlFor="mqtt-cred-clave" size="1" color="gray" mb="1" style={{ display: "block" }}>
                  {editando?.tiene_credencial ? "Nueva contraseña (vacío = conservar la actual)" : "Contraseña"}
                </Text>
                <TextField.Root
                  id="mqtt-cred-clave"
                  type={verClave ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder={`Mínimo ${CLAVE_MIN} caracteres`}
                  style={inputStyle}
                >
                  <TextField.Slot side="right">
                    <button
                      type="button"
                      onClick={() => setVerClave((v) => !v)}
                      aria-label={verClave ? "Ocultar contraseña" : "Ver contraseña"}
                      title={verClave ? "Ocultar contraseña" : "Ver contraseña"}
                      style={{ background: "none", border: 0, color: "inherit", cursor: "pointer", display: "flex" }}
                    >
                      {verClave ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </TextField.Slot>
                </TextField.Root>
              </Box>
              <Box>
                <Text as="label" htmlFor="mqtt-cred-confirmar" size="1" color="gray" mb="1" style={{ display: "block" }}>
                  Confirmar contraseña
                </Text>
                <TextField.Root
                  id="mqtt-cred-confirmar"
                  type={verClave ? "text" : "password"}
                  value={confirmacion}
                  onChange={(e) => setConfirmacion(e.target.value)}
                  autoComplete="new-password"
                  style={inputStyle}
                />
              </Box>

              {formError && (
                <Box p="2" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px" }}>
                  <Text color="red" size="1">{formError}</Text>
                </Box>
              )}
            </Flex>
            <Flex gap="3" mt="5" justify="end">
              <Dialog.Close><Button type="button" variant="soft" color="gray">Cancelar</Button></Dialog.Close>
              <Button type="submit" disabled={guardando || !username.trim()} style={{ cursor: "pointer" }}>
                {guardando ? "Guardando..." : editando?.tiene_credencial ? "Guardar cambios" : "Registrar"}
              </Button>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </Card>
  );
}
