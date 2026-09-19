// src/components/auth/RegisterForm.tsx

'use client'

import Link from "next/link";
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { RegisterFormInputs } from '@/types/auth.types'
import {
  Box,
  Flex,
  TextField,
  Button,
  Card,
  Text,
  Callout,
  Grid,
  Dialog,
  ScrollArea
} from '@radix-ui/themes'
import { ExclamationTriangleIcon, CheckCircledIcon } from '@radix-ui/react-icons'
import { SUPPORT_EMAIL } from '@/config/contact'

export default function RegisterForm() {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterFormInputs>({
    defaultValues: {
      zona_horaria: 'America/Lima'
    }
  })
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [targetUrl, setTargetUrl] = useState<string | null>(null)
  const password = watch('contrasena')

  const onSubmit = async (data: RegisterFormInputs) => {
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: data.nombre.trim(),
          apellido: data.apellido?.trim() || undefined,
          correo: data.correo.trim().toLowerCase(),
          telefono: data.telefono?.trim() || undefined,
          zona_horaria: data.zona_horaria || 'America/Lima',
          dni: data.dni?.trim() || undefined,
          fecha_nacimiento: data.fecha_nacimiento || undefined,
          direccion: data.direccion?.trim() || undefined,
          contrasena: data.contrasena
        })
      })

      const result = await response.json()

      if (!response.ok) {
        // Mensaje genérico y seguro: nunca expone columnas ni estructura interna de la base de datos
        setError('Por favor, verifica tu información.')
      } else {
        const userEmail = data.correo.trim().toLowerCase()
        const redirectUrl = `/auth/verificar-correo?correo=${encodeURIComponent(userEmail)}`
        setTargetUrl(redirectUrl)
        setSuccess(true)
        // Redirección inmediata mediante window.location para evitar cuellos de botella con dev tunnels o router.push RSC
        setTimeout(() => {
          window.location.href = redirectUrl
        }, 500)
      }
    } catch {
      setError('Por favor, verifica tu información.')
    }
  }

  return (
    <Card className="w-full max-w-xl" style={{ padding: '2.5rem' }}>
      <Flex direction="column" align="center" gap="1" mb="4" style={{ textAlign: 'center' }}>
        <Text size="5" weight="bold" style={{ color: 'white' }} as="div">
          Crear Cuenta
        </Text>
        <Text size="2" color="gray" as="div">
          Completa tus datos para acceder al sistema de riego inteligente.
        </Text>
      </Flex>

      <form onSubmit={handleSubmit(onSubmit)} method="POST" className="space-y-4">
        {error && (
          <Callout.Root color="red" role="alert">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        )}

        {success && (
          <Callout.Root color="green">
            <Callout.Icon>
              <CheckCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              ¡Registro exitoso! Hemos enviado un código de confirmación a tu correo. Redirigiendo a la pantalla de verificación...{' '}
              {targetUrl && (
                <a
                  href={targetUrl}
                  style={{
                    color: '#ffffff',
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                    display: 'inline-block',
                    marginLeft: '6px',
                  }}
                >
                  Continuar a verificación →
                </a>
              )}
            </Callout.Text>
          </Callout.Root>
        )}

        {/* Nombres y Apellidos */}
        <Grid columns={{ initial: '1', sm: '2' }} gap="3">
          <Box>
            <label htmlFor="reg-nombre" style={{ display: 'block', marginBottom: '0.25rem' }}>
              <Text size="2" weight="medium">
                Nombres <span style={{ color: '#ef4444' }}>*</span>
              </Text>
            </label>
            <TextField.Root
              id="reg-nombre"
              placeholder="Tus nombres"
              aria-invalid={!!errors.nombre}
              aria-describedby={errors.nombre ? 'reg-nombre-error' : undefined}
              {...register('nombre', {
                required: 'El nombre es requerido',
                minLength: {
                  value: 2,
                  message: 'El nombre debe tener al menos 2 caracteres'
                }
              })}
              style={{ width: '100%' }}
            />
            {errors.nombre && (
              <Text id="reg-nombre-error" size="1" color="red" mt="1" as="div">
                {errors.nombre.message}
              </Text>
            )}
          </Box>

          <Box>
            <label htmlFor="reg-apellido" style={{ display: 'block', marginBottom: '0.25rem' }}>
              <Text size="2" weight="medium">
                Apellidos
              </Text>
            </label>
            <TextField.Root
              id="reg-apellido"
              placeholder="Tus apellidos"
              {...register('apellido')}
              style={{ width: '100%' }}
            />
          </Box>
        </Grid>

        {/* Correo y Teléfono */}
        <Grid columns={{ initial: '1', sm: '2' }} gap="3">
          <Box>
            <label htmlFor="reg-correo" style={{ display: 'block', marginBottom: '0.25rem' }}>
              <Text size="2" weight="medium">
                Correo electrónico <span style={{ color: '#ef4444' }}>*</span>
              </Text>
            </label>
            <TextField.Root
              id="reg-correo"
              placeholder="tu@email.com"
              type="email"
              aria-invalid={!!errors.correo}
              aria-describedby={errors.correo ? 'reg-correo-error' : undefined}
              {...register('correo', {
                required: 'El correo es requerido',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Correo inválido'
                }
              })}
              style={{ width: '100%' }}
            />
            {errors.correo && (
              <Text id="reg-correo-error" size="1" color="red" mt="1" as="div">
                {errors.correo.message}
              </Text>
            )}
          </Box>

          <Box>
            <label htmlFor="reg-telefono" style={{ display: 'block', marginBottom: '0.25rem' }}>
              <Text size="2" weight="medium">
                Teléfono / Celular
              </Text>
            </label>
            <TextField.Root
              id="reg-telefono"
              placeholder="+51 987654321"
              {...register('telefono')}
              style={{ width: '100%' }}
            />
          </Box>
        </Grid>

        {/* DNI y Fecha de Nacimiento */}
        <Grid columns={{ initial: '1', sm: '2' }} gap="3">
          <Box>
            <label htmlFor="reg-dni" style={{ display: 'block', marginBottom: '0.25rem' }}>
              <Text size="2" weight="medium">
                DNI / Documento
              </Text>
            </label>
            <TextField.Root
              id="reg-dni"
              placeholder="8 dígitos"
              maxLength={20}
              {...register('dni')}
              style={{ width: '100%' }}
            />
          </Box>

          <Box>
            <label htmlFor="reg-fecha-nacimiento" style={{ display: 'block', marginBottom: '0.25rem' }}>
              <Text size="2" weight="medium">
                Fecha de nacimiento
              </Text>
            </label>
            <TextField.Root
              id="reg-fecha-nacimiento"
              type="date"
              {...register('fecha_nacimiento')}
              style={{ width: '100%' }}
            />
          </Box>
        </Grid>

        {/* Dirección y Zona Horaria */}
        <Grid columns={{ initial: '1', sm: '2' }} gap="3">
          <Box>
            <label htmlFor="reg-direccion" style={{ display: 'block', marginBottom: '0.25rem' }}>
              <Text size="2" weight="medium">
                Dirección
              </Text>
            </label>
            <TextField.Root
              id="reg-direccion"
              placeholder="Calle, distrito, ciudad"
              {...register('direccion')}
              style={{ width: '100%' }}
            />
          </Box>

          <Box>
            <label htmlFor="reg-zona-horaria" style={{ display: 'block', marginBottom: '0.25rem' }}>
              <Text size="2" weight="medium">
                Zona horaria
              </Text>
            </label>
            <select
              id="reg-zona-horaria"
              {...register('zona_horaria')}
              style={{
                width: '100%',
                height: '32px',
                minHeight: '32px',
                padding: '0 8px',
                borderRadius: '4px',
                background: 'rgba(0, 0, 0, 0.25)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                fontSize: '14px',
                boxSizing: 'border-box'
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

        {/* Contraseñas */}
        <Grid columns={{ initial: '1', sm: '2' }} gap="3">
          <Box>
            <label htmlFor="reg-contrasena" style={{ display: 'block', marginBottom: '0.25rem' }}>
              <Text size="2" weight="medium">
                Contraseña <span style={{ color: '#ef4444' }}>*</span>
              </Text>
            </label>
            <TextField.Root
              id="reg-contrasena"
              placeholder="••••••••"
              type="password"
              aria-invalid={!!errors.contrasena}
              aria-describedby={errors.contrasena ? 'reg-contrasena-error' : undefined}
              {...register('contrasena', {
                required: 'La contraseña es requerida',
                minLength: {
                  value: 10,
                  message: 'Mínimo 10 caracteres'
                },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                  message: 'Mayúscula, minúscula y número'
                }
              })}
              style={{ width: '100%' }}
            />
            {errors.contrasena && (
              <Text id="reg-contrasena-error" size="1" color="red" mt="1" as="div">
                {errors.contrasena.message}
              </Text>
            )}
          </Box>

          <Box>
            <label htmlFor="reg-confirmar-contrasena" style={{ display: 'block', marginBottom: '0.25rem' }}>
              <Text size="2" weight="medium">
                Confirmar contraseña <span style={{ color: '#ef4444' }}>*</span>
              </Text>
            </label>
            <TextField.Root
              id="reg-confirmar-contrasena"
              placeholder="••••••••"
              type="password"
              aria-invalid={!!errors.confirmarContrasena}
              aria-describedby={errors.confirmarContrasena ? 'reg-confirmar-contrasena-error' : undefined}
              {...register('confirmarContrasena', {
                required: 'Debes confirmar la contraseña',
                validate: (value) => value === password || 'Las contraseñas no coinciden'
              })}
              style={{ width: '100%' }}
            />
            {errors.confirmarContrasena && (
              <Text id="reg-confirmar-contrasena-error" size="1" color="red" mt="1" as="div">
                {errors.confirmarContrasena.message}
              </Text>
            )}
          </Box>
        </Grid>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem' }}>
          <input
            type="checkbox"
            {...register('terminos', {
              required: 'Debes aceptar los términos y condiciones'
            })}
            style={{ width: '16px', height: '16px', flexShrink: 0 }}
          />
          <Text size="2">
            Acepto los{' '}
            <Dialog.Root>
              <Dialog.Trigger>
                <span
                  role="button"
                  tabIndex={0}
                  style={{ color: '#38bdf8', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  términos y condiciones
                </span>
              </Dialog.Trigger>
              <Dialog.Content
                aria-describedby={undefined}
                style={{ maxWidth: 560, width: '92vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
              >
                <Dialog.Title>Términos y Condiciones</Dialog.Title>
                <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: '55vh', paddingRight: '1rem' }}>
                  <Flex direction="column" gap="3">
                    <Text size="2" color="gray">
                      Última actualización: 2026. Al crear una cuenta en Yaku aceptas los siguientes términos:
                    </Text>
                    <Box>
                      <Text size="2" weight="bold" as="div" mb="1">1. Uso del servicio</Text>
                      <Text size="2" color="gray" as="div">
                        Yaku es un sistema de riego inteligente. La información que registras (datos personales, de contacto y de tus cultivos) se utiliza únicamente para operar el sistema, generar recomendaciones de riego y contactarte sobre tu cuenta.
                      </Text>
                    </Box>
                    <Box>
                      <Text size="2" weight="bold" as="div" mb="1">2. Cuenta y seguridad</Text>
                      <Text size="2" color="gray" as="div">
                        Eres responsable de mantener la confidencialidad de tu contraseña y de toda actividad realizada desde tu cuenta. Notifícanos de inmediato ante cualquier uso no autorizado.
                      </Text>
                    </Box>
                    <Box>
                      <Text size="2" weight="bold" as="div" mb="1">3. Datos personales</Text>
                      <Text size="2" color="gray" as="div">
                        Tratamos tus datos conforme a la normativa de protección de datos personales vigente en Perú. No compartimos tu información con terceros salvo obligación legal o para el funcionamiento del servicio.
                      </Text>
                    </Box>
                    <Box>
                      <Text size="2" weight="bold" as="div" mb="1">4. Disponibilidad del servicio</Text>
                      <Text size="2" color="gray" as="div">
                        Trabajamos para mantener el sistema disponible de forma continua, pero no garantizamos operación ininterrumpida. El riego automático depende de la conectividad de tus dispositivos.
                      </Text>
                    </Box>
                    <Box>
                      <Text size="2" weight="bold" as="div" mb="1">5. Cambios en los términos</Text>
                      <Text size="2" color="gray" as="div">
                        Podemos actualizar estos términos periódicamente. Te notificaremos sobre cambios relevantes a través del correo registrado en tu cuenta.
                      </Text>
                    </Box>
                    <Box>
                      <Text size="2" weight="bold" as="div" mb="1">6. Contacto</Text>
                      <Text size="2" color="gray" as="div">
                        Para dudas sobre estos términos, escríbenos a {SUPPORT_EMAIL}.
                      </Text>
                    </Box>
                  </Flex>
                </ScrollArea>
                <Flex justify="end" mt="4">
                  <Dialog.Close>
                    <Button variant="soft" color="gray">Cerrar</Button>
                  </Dialog.Close>
                </Flex>
              </Dialog.Content>
            </Dialog.Root>
          </Text>
        </label>
        {errors.terminos && (
          <Text size="1" color="red">
            {errors.terminos.message}
          </Text>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || success}
          style={{ width: '100%', cursor: success ? 'wait' : 'pointer' }}
          size="3"
        >
          {success ? 'Redirigiendo a verificación...' : isSubmitting ? 'Registrando...' : 'Crear cuenta'}
        </Button>

        <Box className="text-center">
          <Text size="2">
            ¿Ya tienes cuenta?{' '}
            <Link
              href="/auth/login"
              style={{ color: '#38bdf8', textDecoration: 'underline', fontWeight: 600 }}
            >
              Inicia sesión aquí
            </Link>
          </Text>
        </Box>
      </form>
    </Card>
  )
}
