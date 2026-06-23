// src/types/auth.types.ts

export interface LoginFormInputs {
  correo: string
  contrasena: string
  recuerdame?: boolean
}

export interface RegisterFormInputs {
  nombre: string
  correo: string
  contrasena: string
  confirmarContrasena: string
  terminos: boolean
}

export interface AuthResponse {
  success: boolean
  message: string
  user?: {
    id_usuario: number
    nombre: string
    correo: string
    id_rol: number
  }
}
