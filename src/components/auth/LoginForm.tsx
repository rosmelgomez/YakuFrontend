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
  TextField, 
  Button, 
  Card, 
  Text, 
  Checkbox,
  Callout
} from '@radix-ui/themes'
import { ExclamationTriangleIcon } from '@radix-ui/react-icons'

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
        setError(result.error)
      } else if (result?.ok) {
        router.push('/dashboard/agricultor')
      }
    } catch (err) {
      setError('Error al iniciar sesión. Intenta de nuevo.')
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

        <Box>
          <label style={{ display: 'block', marginBottom: '0.25rem' }}>
            <Text size="2" weight="medium">
              Correo electrónico
            </Text>
          </label>
          <TextField.Root
            placeholder="investigador@uni.pe"
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
                value: 6,
                message: 'La contraseña debe tener al menos 6 caracteres'
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

        <Box className="flex items-center justify-between">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <Checkbox {...register('recuerdame')} />
            <Text size="2">Recuérdame</Text>
          </label>
          <Link href="#">
            ¿Olvidaste la contraseña?
          </Link>
        </Box>

        <Button
          type="submit"
          disabled={isSubmitting}
          style={{ width: '100%' }}
          size="3"
        >
          {isSubmitting ? 'Ingresando...' : 'Ingresar al sistema'}
        </Button>

        <Box className="text-center">
          <Text size="2">
            ¿No tienes cuenta?{' '}
            <Link href="/auth/register">
              Registrate aquí
            </Link>
          </Text>
        </Box>
      </form>
    </Card>
  )
}
