// src/app/api/auth/recuperar-contrasena/solicitar/route.ts
import { NextResponse } from 'next/server';
import { fetchPublicFastAPI } from '@/lib/api/client';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { correo } = body;

    if (!correo || typeof correo !== 'string') {
      return NextResponse.json(
        { message: 'El correo electrónico es requerido' },
        { status: 400 }
      );
    }

    const res = await fetchPublicFastAPI('/auth/recuperar-contrasena/solicitar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        correo: correo.trim().toLowerCase(),
      }),
    });

    if (!res.ok) {
      const errMsg = await res.text();
      let parsedError = 'No se pudo procesar la solicitud de recuperación';
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
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: 'Error interno al solicitar la recuperación de contraseña' },
      { status: 500 }
    );
  }
}
