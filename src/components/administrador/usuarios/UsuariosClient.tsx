"use client";

import React, { useState, useTransition } from "react";
import { Badge, Box, Button, Card, Dialog, Flex, Grid, ScrollArea, Select, Table, Text, TextField } from "@radix-ui/themes";
import { Plus, Power, RefreshCw, Shield, User } from "lucide-react";
import { cambiarEstadoUsuario, cambiarRolUsuario, registrarUsuario } from "@/actions/admin";

export default function UsuariosClient({ initialUsers = [], initialDevices = [], initialCrops = [] }: any) {
  const [users, setUsers] = useState(initialUsers);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [isOpenRegisterUser, setIsOpenRegisterUser] = useState(false);
  const [newUserNombre, setNewUserNombre] = useState("");
  const [newUserApellido, setNewUserApellido] = useState("");
  const [newUserCorreo, setNewUserCorreo] = useState("");
  const [newUserTelefono, setNewUserTelefono] = useState("");
  const [newUserZonaHoraria, setNewUserZonaHoraria] = useState("America/Lima");
  const [newUserDni, setNewUserDni] = useState("");
  const [newUserFechaNacimiento, setNewUserFechaNacimiento] = useState("");
  const [newUserDireccion, setNewUserDireccion] = useState("");
  const [newUserContrasena, setNewUserContrasena] = useState("");
  const [newUserRolId, setNewUserRolId] = useState("2");
  const pageSize = 8;

  const handleToggleEstadoUser = async (userId: number, currentEstado: boolean) => {
    startTransition(async () => {
      try {
        const res = await cambiarEstadoUsuario(userId, !currentEstado);
        if (res.status === "ok") {
          setUsers((prev: any[]) => prev.map((u) => (u.id === userId ? { ...u, estado: !currentEstado } : u)));
        }
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      }
    });
  };

  const handleToggleRolUser = async (userId: number, currentRolId: number) => {
    const nextRolId = currentRolId === 1 ? 2 : 1;
    startTransition(async () => {
      try {
        const res = await cambiarRolUsuario(userId, nextRolId);
        if (res.status === "ok") {
          setUsers((prev: any[]) =>
            prev.map((u) =>
              u.id === userId
                ? { ...u, id_rol: nextRolId, rol: { ...u.rol, nombre: nextRolId === 1 ? "administrador" : "agricultor" } }
                : u,
            ),
          );
        }
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      }
    });
  };

  const handleRegisterUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserNombre.trim() || !newUserCorreo.trim() || !newUserContrasena) {
      alert("Por favor, complete todos los campos obligatorios.");
      return;
    }

    if (newUserContrasena.length < 10) {
      alert("La contraseña debe tener al menos 10 caracteres.");
      return;
    }

    const hasUpper = /[A-Z]/.test(newUserContrasena);
    const hasLower = /[a-z]/.test(newUserContrasena);
    const hasDigit = /\d/.test(newUserContrasena);
    if (!hasUpper || !hasLower || !hasDigit) {
      alert("La contraseña debe incluir al menos una letra mayúscula, una minúscula y un número.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await registrarUsuario({
          nombre: newUserNombre.trim(),
          apellido: newUserApellido.trim() || undefined,
          correo: newUserCorreo.trim().toLowerCase(),
          contrasena: newUserContrasena,
          telefono: newUserTelefono.trim() || undefined,
          zona_horaria: newUserZonaHoraria || "America/Lima",
          dni: newUserDni.trim() || undefined,
          fecha_nacimiento: newUserFechaNacimiento || undefined,
          direccion: newUserDireccion.trim() || undefined,
          id_rol: parseInt(newUserRolId, 10),
        });

        if (res.success || res.userId) {
          setIsOpenRegisterUser(false);
          setNewUserNombre("");
          setNewUserApellido("");
          setNewUserCorreo("");
          setNewUserTelefono("");
          setNewUserZonaHoraria("America/Lima");
          setNewUserDni("");
          setNewUserFechaNacimiento("");
          setNewUserDireccion("");
          setNewUserContrasena("");
          setNewUserRolId("2");
          window.location.reload();
        }
      } catch (err: any) {
        alert(`Error al registrar usuario: ${err.message}`);
      }
    });
  };

  return (
    <Box style={{ opacity: isPending ? 0.6 : 1, transition: "opacity 0.2s" }}>
      <Flex direction="column" gap="4" mb="6">
        <Box>
          <Text size="6" weight="bold" color="indigo" as="div">Usuarios</Text>
          <Text size="2" color="gray" style={{ fontFamily: "monospace" }}>Gestiona roles, estados y cuentas del sistema.</Text>
        </Box>
      </Flex>

      <Card size="3" style={{ background: "var(--surface-mockup)", borderColor: "var(--border-mockup)", borderRadius: "16px" }}>
        <Flex
          direction={{ initial: "column", sm: "row" }}
          justify="between"
          align={{ initial: "stretch", sm: "center" }}
          gap="3"
          mb="4"
        >
          <Text size={{ initial: "4", sm: "5" }} weight="bold" color="indigo" as="div">
            Usuarios del Sistema
          </Text>
          <Button
            color="indigo"
            size="2"
            onClick={() => setIsOpenRegisterUser(true)}
            style={{ cursor: "pointer", minHeight: "44px" }}
          >
            <Plus size={18} style={{ marginRight: "6px" }} /> Registrar Usuario
          </Button>
        </Flex>

        <ScrollArea scrollbars="horizontal" style={{ width: "100%" }}>
          <Table.Root variant="surface" style={{ background: "transparent", minWidth: "700px" }}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Nombre</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Contacto</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Rol</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Recursos</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Actividad</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Estado</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Acciones</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {users.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((u: any) => {
                const isAdmin = u.rol?.nombre === "administrador";
                const userCropsCount = initialCrops.filter((c: any) => Number(c.id_usuario) === Number(u.id)).length;
                const userDevicesCount = initialDevices.filter((d: any) => d.id_usuario !== null && Number(d.id_usuario) === Number(u.id)).length;
                const fechaReg = u.fecha_registro ? new Date(u.fecha_registro).toLocaleDateString("es-ES") : "-";
                const ultimoAcc = u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleDateString("es-ES") : "Nunca";

                return (
                  <Table.Row key={u.id}>
                    <Table.RowHeaderCell>
                      <Flex gap="2" align="center">
                        {isAdmin ? <Shield size={16} color="#c084fc" /> : <User size={16} color="#60a5fa" />}
                        <Text size="2" weight="bold" style={{ color: "white" }}>{u.nombre} {u.apellido || ""}</Text>
                      </Flex>
                    </Table.RowHeaderCell>
                    <Table.Cell>
                      <Flex direction="column" gap="1">
                        <Text size="1" color="gray" style={{ fontFamily: "monospace" }}>{u.correo}</Text>
                        <Text size="1" style={{ color: "#94a3b8" }}>{u.telefono || "Sin telefono"}</Text>
                        {u.dni && <Text size="1" color="cyan">DNI: {u.dni}</Text>}
                        {u.direccion && (
                          <Text size="1" color="gray" style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={u.direccion}>
                            📍 {u.direccion}
                          </Text>
                        )}
                      </Flex>
                    </Table.Cell>
                    <Table.Cell><Badge color={isAdmin ? "purple" : "blue"} variant="soft">{u.rol?.nombre?.toUpperCase()}</Badge></Table.Cell>
                    <Table.Cell>
                      {isAdmin ? <Badge color="gray" variant="surface">N/A</Badge> : (
                        <Flex gap="1" wrap="wrap">
                          <Badge color="green" variant="soft">{userCropsCount} Cultivos</Badge>
                          <Badge color="orange" variant="soft">{userDevicesCount} Disp.</Badge>
                        </Flex>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Flex direction="column" gap="1">
                        <Text size="1" color="gray">Reg: <span style={{ color: "white" }}>{fechaReg}</span></Text>
                        <Text size="1" color="gray">Acceso: <span style={{ color: "white" }}>{ultimoAcc}</span></Text>
                      </Flex>
                    </Table.Cell>
                    <Table.Cell><Badge color={u.estado ? "green" : "red"} variant="soft">{u.estado ? "Activo" : "Dado de baja"}</Badge></Table.Cell>
                    <Table.Cell>
                      <Flex gap="2">
                        <Button size="1" color={u.estado ? "red" : "green"} variant="soft" onClick={() => handleToggleEstadoUser(u.id, u.estado)} style={{ cursor: "pointer" }}>
                          <Power size={12} style={{ marginRight: "4px" }} /> {u.estado ? "Dar de baja" : "Reactivar"}
                        </Button>
                        <Button size="1" color="gray" variant="outline" onClick={() => handleToggleRolUser(u.id, u.id_rol)} style={{ cursor: "pointer" }}>
                          <RefreshCw size={12} style={{ marginRight: "4px" }} /> Cambiar Rol
                        </Button>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        </ScrollArea>

        {users.length > pageSize && (
          <Flex justify="between" align="center" mt="4" px="2">
            <Text size="2" color="gray">Mostrando {Math.min((currentPage - 1) * pageSize + 1, users.length)} a {Math.min(currentPage * pageSize, users.length)} de {users.length}</Text>
            <Flex gap="1">
              <Button size="1" variant="soft" color="gray" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>Anterior</Button>
              <Button size="1" variant="soft" color="gray" onClick={() => setCurrentPage((p) => Math.min(p + 1, Math.ceil(users.length / pageSize)))} disabled={currentPage === Math.ceil(users.length / pageSize)}>Siguiente</Button>
            </Flex>
          </Flex>
        )}
      </Card>

      <Dialog.Root open={isOpenRegisterUser} onOpenChange={setIsOpenRegisterUser}>
        <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 520, background: "var(--surface-mockup)", border: "1px solid var(--border-mockup)" }}>
          <Dialog.Title style={{ color: "white" }}>Registrar Nuevo Usuario</Dialog.Title>
          <form onSubmit={handleRegisterUserSubmit}>
            <Flex direction="column" gap="3" mt="3">
              <Grid columns="2" gap="3">
                <Box>
                  <Text size="1" color="gray" mb="1" as="div">Nombres *</Text>
                  <TextField.Root placeholder="Nombres" value={newUserNombre} onChange={(e) => setNewUserNombre(e.target.value)} required />
                </Box>
                <Box>
                  <Text size="1" color="gray" mb="1" as="div">Apellidos</Text>
                  <TextField.Root placeholder="Apellidos" value={newUserApellido} onChange={(e) => setNewUserApellido(e.target.value)} />
                </Box>
              </Grid>

              <Grid columns="2" gap="3">
                <Box>
                  <Text size="1" color="gray" mb="1" as="div">Correo Electrónico *</Text>
                  <TextField.Root type="email" placeholder="Correo" value={newUserCorreo} onChange={(e) => setNewUserCorreo(e.target.value)} required />
                </Box>
                <Box>
                  <Text size="1" color="gray" mb="1" as="div">Teléfono</Text>
                  <TextField.Root placeholder="Teléfono" value={newUserTelefono} onChange={(e) => setNewUserTelefono(e.target.value)} />
                </Box>
              </Grid>

              <Grid columns="2" gap="3">
                <Box>
                  <Text size="1" color="gray" mb="1" as="div">DNI / Documento</Text>
                  <TextField.Root placeholder="8 dígitos" maxLength={20} value={newUserDni} onChange={(e) => setNewUserDni(e.target.value)} />
                </Box>
                <Box>
                  <Text size="1" color="gray" mb="1" as="div">Fecha de Nacimiento</Text>
                  <TextField.Root type="date" value={newUserFechaNacimiento} onChange={(e) => setNewUserFechaNacimiento(e.target.value)} />
                </Box>
              </Grid>

              <Grid columns="2" gap="3">
                <Box>
                  <Text size="1" color="gray" mb="1" as="div">Dirección</Text>
                  <TextField.Root placeholder="Dirección personal" value={newUserDireccion} onChange={(e) => setNewUserDireccion(e.target.value)} />
                </Box>
                <Box>
                  <Text size="1" color="gray" mb="1" as="div">Zona Horaria</Text>
                  <select
                    value={newUserZonaHoraria}
                    onChange={(e) => setNewUserZonaHoraria(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      background: "#1e293b",
                      color: "white",
                      border: "1px solid #334155",
                      fontSize: "0.85rem",
                      height: "32px",
                    }}
                  >
                    <option value="America/Lima">America/Lima (UTC-5)</option>
                    <option value="America/Bogota">America/Bogota (UTC-5)</option>
                    <option value="America/Santiago">America/Santiago (UTC-3)</option>
                    <option value="America/Argentina/Buenos_Aires">America/Buenos_Aires (UTC-3)</option>
                    <option value="America/Mexico_City">America/Mexico_City (UTC-6)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </Box>
              </Grid>

              <Grid columns="2" gap="3">
                <Box>
                  <Text size="1" color="gray" mb="1" as="div">Rol del Sistema</Text>
                  <Select.Root value={newUserRolId} onValueChange={setNewUserRolId}>
                    <Select.Trigger style={{ width: "100%" }} />
                    <Select.Content>
                      <Select.Item value="1">Administrador</Select.Item>
                      <Select.Item value="2">Agricultor</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Box>
                <Box>
                  <Text size="1" color="gray" mb="1" as="div">Contraseña *</Text>
                  <TextField.Root type="password" placeholder="Mínimo 10 caracteres" value={newUserContrasena} onChange={(e) => setNewUserContrasena(e.target.value)} required />
                </Box>
              </Grid>
              <Text size="1" color="gray" mt="1" as="div">
                La contraseña debe tener al menos 10 caracteres, incluir mayúsculas, minúsculas y números.
              </Text>
            </Flex>
            <Flex gap="3" mt="6" justify="end">
              <Dialog.Close><Button variant="soft" color="gray">Cancelar</Button></Dialog.Close>
              <Button type="submit" color="green" disabled={!newUserNombre || !newUserCorreo || !newUserContrasena}>Crear Usuario</Button>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
}
