// src/components/auth/RegisterForm.tsx

'use client'

import Link from "next/link";
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { RegisterFormInputs } from '@/types/auth.types'
import { 
  Box, 
  TextField, 
  Button, 
  Card, 
  Text, 
  Link as RadixLink,
  Callout,
  Grid
} from '@radix-ui/themes'
import { ExclamationTriangleIcon, CheckCircledIcon } from '@radix-ui/react-icons'

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
    <Card className="w-full max-w-xl" style={{ padding: '2rem' }}>
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
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
              <Text size="2" weight="medium">
                Nombres <span style={{ color: '#ef4444' }}>*</span>
              </Text>
            </label>
            <TextField.Root
              placeholder="Tus nombres"
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
              <Text size="1" color="red" mt="1">
                {errors.nombre.message}
              </Text>
            )}
          </Box>

          <Box>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
              <Text size="2" weight="medium">
                Apellidos
              </Text>
            </label>
            <TextField.Root
              placeholder="Tus apellidos"
              {...register('apellido')}
              style={{ width: '100%' }}
            />
          </Box>
        </Grid>

        {/* Correo y Teléfono */}
        <Grid columns={{ initial: '1', sm: '2' }} gap="3">
          <Box>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
              <Text size="2" weight="medium">
                Correo electrónico <span style={{ color: '#ef4444' }}>*</span>
              </Text>
            </label>
            <TextField.Root
              placeholder="tu@email.com"
              type="email"
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
              <Text size="1" color="red" mt="1">
                {errors.correo.message}
              </Text>
            )}
          </Box>

          <Box>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
              <Text size="2" weight="medium">
                Teléfono / Celular
              </Text>
            </label>
            <TextField.Root
              placeholder="+51 987654321"
              {...register('telefono')}
              style={{ width: '100%' }}
            />
          </Box>
        </Grid>

        {/* DNI y Fecha de Nacimiento */}
        <Grid columns={{ initial: '1', sm: '2' }} gap="3">
          <Box>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
              <Text size="2" weight="medium">
                DNI / Documento
              </Text>
            </label>
            <TextField.Root
              placeholder="8 dígitos"
              maxLength={20}
              {...register('dni')}
              style={{ width: '100%' }}
            />
          </Box>

          <Box>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
              <Text size="2" weight="medium">
                Fecha de nacimiento
              </Text>
            </label>
            <TextField.Root
              type="date"
              {...register('fecha_nacimiento')}
              style={{ width: '100%' }}
            />
          </Box>
        </Grid>

        {/* Dirección y Zona Horaria */}
        <Grid columns={{ initial: '1', sm: '2' }} gap="3">
          <Box>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
              <Text size="2" weight="medium">
                Dirección
              </Text>
            </label>
            <TextField.Root
              placeholder="Calle, distrito, ciudad"
              {...register('direccion')}
              style={{ width: '100%' }}
            />
          </Box>

          <Box>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
              <Text size="2" weight="medium">
                Zona horaria
              </Text>
            </label>
            <select
              {...register('zona_horaria')}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '6px',
                background: '#1e293b',
                color: 'white',
                border: '1px solid #334155',
                fontSize: '0.875rem'
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
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
              <Text size="2" weight="medium">
                Contraseña <span style={{ color: '#ef4444' }}>*</span>
              </Text>
            </label>
            <TextField.Root
              placeholder="••••••••"
              type="password"
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
              <Text size="1" color="red" mt="1">
                {errors.contrasena.message}
              </Text>
            )}
          </Box>

          <Box>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
              <Text size="2" weight="medium">
                Confirmar contraseña <span style={{ color: '#ef4444' }}>*</span>
              </Text>
            </label>
            <TextField.Root
              placeholder="••••••••"
              type="password"
              {...register('confirmarContrasena', {
                required: 'Debes confirmar la contraseña',
                validate: (value) => value === password || 'Las contraseñas no coinciden'
              })}
              style={{ width: '100%' }}
            />
            {errors.confirmarContrasena && (
              <Text size="1" color="red" mt="1">
                {errors.confirmarContrasena.message}
              </Text>
            )}
          </Box>
        </Grid>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem' }}>
          <input
            type="checkbox"
            {...register('terminos', {
              required: 'Debes aceptar los términos y condiciones'
            })}
            style={{ marginTop: '0.25rem' }}
          />
          <Text size="2">
            Acepto los{' '}
            <RadixLink href="#">términos y condiciones</RadixLink>
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
            <Link href="/auth/login">
              Inicia sesión aquí
            </Link>
          </Text>
        </Box>
      </form>
    </Card>
  )
}
