// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { fetchPublicFastAPI } from '@/lib/api/client';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nombre, correo, contrasena } = body;

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
      body: JSON.stringify({ nombre, correo, contrasena }),
    });

    if (!res.ok) {
      const errMsg = await res.text();
      let parsedError = 'Error al registrar usuario';
      try {
        const jsonErr = JSON.parse(errMsg);
        parsedError = jsonErr.detail || parsedError;
      } catch (e) {}
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
