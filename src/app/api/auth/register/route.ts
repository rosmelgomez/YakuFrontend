// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { fetchPublicFastAPI } from '@/lib/api/client';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      nombre,
      apellido,
      correo,
      contrasena,
      telefono,
      zona_horaria,
      dni,
      fecha_nacimiento,
      direccion,
    } = body;

    if (!nombre || !correo || !contrasena) {
      return NextResponse.json(
        { message: 'Nombre, correo y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const res = await fetchPublicFastAPI('/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nombre,
        apellido: apellido || undefined,
        correo,
        contrasena,
        telefono: telefono || undefined,
        zona_horaria: zona_horaria || 'America/Lima',
        dni: dni || undefined,
        fecha_nacimiento: fecha_nacimiento || undefined,
        direccion: direccion || undefined,
      }),
    });

    if (!res.ok) {
      const errMsg = await res.text();
      let parsedError = 'Error al registrar usuario';
      try {
        const jsonErr = JSON.parse(errMsg);
        parsedError = jsonErr.detail || parsedError;
      } catch {}
      return NextResponse.json(
        { message: parsedError },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
