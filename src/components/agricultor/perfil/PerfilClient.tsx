"use client";

import React, { useState, useTransition } from 'react';
import { Box, Card, Grid, Flex, Text, Button, TextField, Badge, Separator } from '@radix-ui/themes';
import { User, Mail, Lock, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { actualizarPerfil } from '@/actions/profile';
import { signOut } from 'next-auth/react';

export default function PerfilClient({ user }: { user: any }) {
  const [nombre, setNombre] = useState(user.nombre || user.name || "");
  const [apellido, setApellido] = useState(user.apellido || "");
  const [correo, setCorreo] = useState(user.correo || user.email || "");
  const [telefono, setTelefono] = useState(user.telefono || "");
  const [contrasena, setContrasena] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] = useState("");
  
  const [isPending, startTransition] = useTransition();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!nombre.trim() || !correo.trim()) {
      setErrorMsg("El nombre y el correo son campos obligatorios.");
      return;
    }

    if (contrasena) {
      if (contrasena.length < 10) {
        setErrorMsg("La nueva contraseña debe tener al menos 10 caracteres.");
        return;
      }
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(contrasena)) {
        setErrorMsg("La contraseña debe incluir mayúsculas, minúsculas y un número.");
        return;
      }
      if (contrasena !== confirmarContrasena) {
        setErrorMsg("Las contraseñas no coinciden.");
        return;
      }
    }

    startTransition(async () => {
      try {
        const payload: any = {
          nombre,
          apellido: apellido || undefined,
          correo,
          telefono: telefono || undefined
        };
        if (contrasena) {
          payload.contrasena = contrasena;
        }

        const res = await actualizarPerfil(payload);
        if (res.success) {
          if (contrasena) {
            await signOut({ callbackUrl: '/auth/login' });
            return;
          }
          setSuccessMsg("✓ Perfil actualizado correctamente. Inicie sesión nuevamente para ver todos los cambios reflejados en el menú lateral.");
          setContrasena("");
          setConfirmarContrasena("");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Ocurrió un error al actualizar el perfil.");
      }
    });
  };

  const isAdmin = user.rol === 'administrador' || user.id_rol === 1;

  return (
    <Box style={{ opacity: isPending ? 0.8 : 1, transition: 'opacity 0.2s', width: '100%' }}>
      {/* HEADER */}
      <Flex direction="column" gap="1" mb="6">
        <Text size="6" weight="bold" color="indigo" as="div">
          Mi Perfil de Usuario
        </Text>
        <Text size="2" color="gray" style={{ fontFamily: 'monospace' }}>
          Gestione su información personal, credenciales de acceso y niveles de seguridad.
        </Text>
      </Flex>

      <Grid columns={{ initial: '1', lg: '3' }} gap="6" width="100%">
        {/* COLUMNA IZQUIERDA: RESUMEN DE ROL / TARJETA PERFIL */}
        <Box style={{ gridColumn: 'span 1' }}>
          <Card size="3" style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px', textAlign: 'center', height: '100%' }}>
            <Flex direction="column" gap="4" align="center" justify="center" py="4" style={{ height: '100%' }}>
              {/* Avatar circular */}
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '2rem',
                fontWeight: 'bold',
                boxShadow: '0 4px 20px rgba(79, 70, 229, 0.4)'
              }}>
                {(((nombre || "")[0] || "") + ((apellido || "")[0] || "") || "U").toUpperCase()}
              </div>

              <Box>
                <Text size="5" weight="bold" style={{ color: 'white' }} as="div" mb="1">
                  {nombre} {apellido}
                </Text>
                <Text size="2" color="gray" style={{ fontFamily: 'monospace' }}>
                  {correo}
                </Text>
              </Box>

              <Flex gap="2" align="center" mt="2">
                <Shield size={16} color={isAdmin ? "#c084fc" : "#60a5fa"} />
                <Badge color={isAdmin ? "purple" : "blue"} size="2" variant="solid" style={{ borderRadius: '6px', padding: '4px 10px' }}>
                  {(user.rol || (isAdmin ? "administrador" : "agricultor")).toUpperCase()}
                </Badge>
              </Flex>

              <Text size="1" color="gray" style={{ fontStyle: 'italic', maxWidth: '200px', margin: '0 auto', lineHeight: '1.4' }} mt="3">
                {isAdmin 
                  ? 'Tienes privilegios completos de administrador. Puedes gestionar hardware, roles y auditoría.' 
                  : 'Nivel: Agricultor. Tienes acceso al monitoreo en tiempo real, histórico de sensores y control inteligente.'
                }
              </Text>
            </Flex>
          </Card>
        </Box>

        {/* COLUMNA CENTRAL/DERECHA: FORMULARIO */}
        <Box style={{ gridColumn: 'span 2' }}>
          <Card size="3" style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px' }}>
            <form onSubmit={handleSubmit}>
              <Flex direction="column" gap="4">
                <Text size="4" weight="bold" style={{ color: 'white' }}>
                  Información de la Cuenta
                </Text>

                {successMsg && (
                  <Box p="3" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '8px' }}>
                    <Flex gap="2" align="center">
                      <CheckCircle size={16} color="#22c55e" />
                      <Text color="green" size="2">{successMsg}</Text>
                    </Flex>
                  </Box>
                )}

                {errorMsg && (
                  <Box p="3" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px' }}>
                    <Flex gap="2" align="center">
                      <AlertCircle size={16} color="#ef4444" />
                      <Text color="red" size="2">{errorMsg}</Text>
                    </Flex>
                  </Box>
                )}

                <Grid columns={{ initial: '1', sm: '2' }} gap="4">
                  <Box>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '6px', fontWeight: '500' }}>
                      Nombres
                    </label>
                    <TextField.Root 
                      placeholder="Ingrese sus nombres"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      style={{ background: '#1e293b', color: 'white' }}
                    >
                      <TextField.Slot>
                        <User size={14} color="#94a3b8" />
                      </TextField.Slot>
                    </TextField.Root>
                  </Box>

                  <Box>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '6px', fontWeight: '500' }}>
                      Apellidos
                    </label>
                    <TextField.Root 
                      placeholder="Ingrese sus apellidos"
                      value={apellido}
                      onChange={(e) => setApellido(e.target.value)}
                      style={{ background: '#1e293b', color: 'white' }}
                    >
                      <TextField.Slot>
                        <User size={14} color="#94a3b8" />
                      </TextField.Slot>
                    </TextField.Root>
                  </Box>
                </Grid>

                <Grid columns={{ initial: '1', sm: '2' }} gap="4">
                  <Box>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '6px', fontWeight: '500' }}>
                      Correo Electrónico
                    </label>
                    <TextField.Root 
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      style={{ background: '#1e293b', color: 'white' }}
                    >
                      <TextField.Slot>
                        <Mail size={14} color="#94a3b8" />
                      </TextField.Slot>
                    </TextField.Root>
                  </Box>

                  <Box>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '6px', fontWeight: '500' }}>
                      Teléfono / Celular
                    </label>
                    <TextField.Root 
                      placeholder="Ej: +51 987654321"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      style={{ background: '#1e293b', color: 'white' }}
                    >
                      <TextField.Slot>
                        <span style={{ fontSize: '14px', marginRight: '4px' }}>📞</span>
                      </TextField.Slot>
                    </TextField.Root>
                  </Box>
                </Grid>

                <Separator size="4" style={{ background: '#1f2937', margin: '8px 0' }} />

                <Text size="4" weight="bold" style={{ color: 'white' }}>
                  Cambiar Contraseña (Opcional)
                </Text>

                <Grid columns={{ initial: '1', sm: '2' }} gap="4">
                  <Box>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '6px', fontWeight: '500' }}>
                      Nueva Contraseña
                    </label>
                    <TextField.Root 
                      type="password"
                      placeholder="Dejar en blanco para no cambiar"
                      value={contrasena}
                      onChange={(e) => setContrasena(e.target.value)}
                      style={{ background: '#1e293b', color: 'white' }}
                    >
                      <TextField.Slot>
                        <Lock size={14} color="#94a3b8" />
                      </TextField.Slot>
                    </TextField.Root>
                  </Box>

                  <Box>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '6px', fontWeight: '500' }}>
                      Confirmar Nueva Contraseña
                    </label>
                    <TextField.Root 
                      type="password"
                      placeholder="Dejar en blanco para no cambiar"
                      value={confirmarContrasena}
                      onChange={(e) => setConfirmarContrasena(e.target.value)}
                      style={{ background: '#1e293b', color: 'white' }}
                    >
                      <TextField.Slot>
                        <Lock size={14} color="#94a3b8" />
                      </TextField.Slot>
                    </TextField.Root>
                  </Box>
                </Grid>

                <Flex justify="end" mt="3">
                  <Button 
                    type="submit" 
                    color="indigo" 
                    size="3" 
                    disabled={isPending}
                    style={{ cursor: 'pointer', borderRadius: '8px', padding: '0 24px', fontWeight: 'bold' }}
                  >
                    {isPending ? 'Guardando...' : '💾 Guardar Cambios'}
                  </Button>
                </Flex>
              </Flex>
            </form>
          </Card>
        </Box>
      </Grid>
    </Box>
  );
}
