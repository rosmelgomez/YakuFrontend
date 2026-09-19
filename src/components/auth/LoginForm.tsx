// src/components/auth/LoginForm.tsx

'use client'

import Link from "next/link";
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { LoginFormInputs } from '@/types/auth.types'
import {
  Box,
  Flex,
  TextField,
  Button,
  Card,
  Text,
  Checkbox,
  Callout
} from '@radix-ui/themes'
import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { LogIn } from 'lucide-react'

export default function LoginForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormInputs>()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (data: LoginFormInputs) => {
    setError(null)
    
    try {
      const result = await signIn('credentials', {
        correo: data.correo,
        contrasena: data.contrasena,
        redirect: false
      })

      if (result?.error) {
        if (
          result.error.toLowerCase().includes('verific') ||
          result.error.toLowerCase().includes('no verificada')
        ) {
          window.location.href = `/auth/verificar-correo?correo=${encodeURIComponent(data.correo.trim().toLowerCase())}`
          return
        }
        setError(result.error)
      } else if (result?.ok) {
        window.location.href = '/dashboard/agricultor'
      }
    } catch {
      setError('Error al iniciar sesión. Intenta de nuevo.')
    }
  }

  return (
    <Card className="w-full max-w-md" style={{ padding: '2.5rem' }}>
      <Flex direction="column" align="center" gap="1" mb="4" style={{ textAlign: 'center' }}>
        <Text size="5" weight="bold" style={{ color: 'white' }} as="div">
          Bienvenido de nuevo
        </Text>
        <Text size="2" color="gray" as="div">
          Ingresa tus credenciales para continuar.
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

        <Box>
          <label htmlFor="login-correo" style={{ display: 'block', marginBottom: '0.25rem' }}>
            <Text size="2" weight="medium">
              Correo electrónico
            </Text>
          </label>
          <TextField.Root
            id="login-correo"
            placeholder="investigador@uni.pe"
            type="email"
            aria-invalid={!!errors.correo}
            aria-describedby={errors.correo ? 'login-correo-error' : undefined}
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
            <Text id="login-correo-error" size="1" color="red" mt="1" as="div">
              {errors.correo.message}
            </Text>
          )}
        </Box>

        <Box>
          <label htmlFor="login-contrasena" style={{ display: 'block', marginBottom: '0.25rem' }}>
            <Text size="2" weight="medium">
              Contraseña
            </Text>
          </label>
          <TextField.Root
            id="login-contrasena"
            placeholder="••••••••"
            type="password"
            aria-invalid={!!errors.contrasena}
            aria-describedby={errors.contrasena ? 'login-contrasena-error' : undefined}
            {...register('contrasena', {
              required: 'La contraseña es requerida',
              minLength: {
                value: 6,
                message: 'La contraseña debe tener al menos 6 caracteres'
              }
            })}
            style={{ width: '100%' }}
          />
          {errors.contrasena && (
            <Text id="login-contrasena-error" size="1" color="red" mt="1" as="div">
              {errors.contrasena.message}
            </Text>
          )}
        </Box>

        <Box className="flex items-center justify-between">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <Checkbox {...register('recuerdame')} />
            <Text size="2">Recuérdame</Text>
          </label>
          <Link
            href="/auth/recuperar-contrasena"
            style={{ color: '#38bdf8', textDecoration: 'underline', fontWeight: 500 }}
          >
            ¿Olvidaste la contraseña?
          </Link>
        </Box>

        <Button
          type="submit"
          disabled={isSubmitting}
          style={{ width: '100%', cursor: isSubmitting ? 'wait' : 'pointer' }}
          size="3"
        >
          <Flex align="center" gap="2" justify="center">
            <LogIn size={18} />
            {isSubmitting ? 'Ingresando...' : 'Ingresar al sistema'}
          </Flex>
        </Button>

        <Box className="text-center">
          <Text size="2">
            ¿No tienes cuenta?{' '}
            <Link
              href="/auth/register"
              style={{ color: '#38bdf8', textDecoration: 'underline', fontWeight: 600 }}
            >
              Regístrate aquí
            </Link>
          </Text>
        </Box>
      </form>
    </Card>
  )
}
