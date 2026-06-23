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
  Callout
} from '@radix-ui/themes'
import { ExclamationTriangleIcon, CheckCircledIcon } from '@radix-ui/react-icons'

export default function RegisterForm() {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterFormInputs>()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const password = watch('contrasena')

  const onSubmit = async (data: RegisterFormInputs) => {
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: data.nombre,
          correo: data.correo,
          contrasena: data.contrasena
        })
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.message || 'Error al registrarse')
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push('/auth/login')
        }, 2000)
      }
    } catch (err) {
      setError('Error al registrarse. Intenta de nuevo.')
    }
  }

  return (
    <Card className="w-full max-w-md" style={{ padding: '2rem' }}>
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
            <Callout.Text>¡Registro exitoso! Redirigiendo...</Callout.Text>
          </Callout.Root>
        )}

        <Box>
          <label style={{ display: 'block', marginBottom: '0.25rem' }}>
            <Text size="2" weight="medium">
              Nombre completo
            </Text>
          </label>
          <TextField.Root
            placeholder="Tu nombre completo"
            {...register('nombre', {
              required: 'El nombre es requerido',
              minLength: {
                value: 3,
                message: 'El nombre debe tener al menos 3 caracteres'
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
              Correo electrónico
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
              Contraseña
            </Text>
          </label>
          <TextField.Root
            placeholder="••••••••"
            type="password"
            {...register('contrasena', {
              required: 'La contraseña es requerida',
              minLength: {
                value: 10,
                message: 'La contraseña debe tener al menos 10 caracteres'
              },
              pattern: {
                value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                message: 'Debe contener mayúscula, minúscula y número'
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
              Confirmar contraseña
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

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
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
          disabled={isSubmitting}
          style={{ width: '100%' }}
          size="3"
        >
          {isSubmitting ? 'Registrando...' : 'Crear cuenta'}
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
