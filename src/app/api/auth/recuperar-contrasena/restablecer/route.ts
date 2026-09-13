// src/app/api/auth/recuperar-contrasena/restablecer/route.ts
import { NextResponse } from 'next/server';
import { fetchPublicFastAPI } from '@/lib/api/client';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { correo, codigo, nueva_contrasena } = body;

    if (!correo || typeof correo !== 'string') {
      return NextResponse.json(
        { message: 'El correo electrónico es requerido' },
        { status: 400 }
      );
    }

    if (!codigo || typeof codigo !== 'string' || codigo.trim().length !== 6) {
      return NextResponse.json(
        { message: 'El código debe tener 6 dígitos' },
        { status: 400 }
      );
    }

    if (!nueva_contrasena || typeof nueva_contrasena !== 'string') {
      return NextResponse.json(
        { message: 'La nueva contraseña es requerida' },
        { status: 400 }
      );
    }

    const res = await fetchPublicFastAPI('/auth/recuperar-contrasena/restablecer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        correo: correo.trim().toLowerCase(),
        codigo: codigo.trim(),
        nueva_contrasena,
      }),
    });

    if (!res.ok) {
      const errMsg = await res.text();
      let parsedError = 'No se pudo restablecer la contraseña';
      try {
        const jsonErr = JSON.parse(errMsg);
        if (jsonErr.detail) {
          if (typeof jsonErr.detail === 'string') {
            parsedError = jsonErr.detail;
          } else if (Array.isArray(jsonErr.detail)) {
            parsedError = jsonErr.detail.map((d: any) => d.msg).join(', ');
          }
        }
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
      { message: 'Error interno al restablecer la contraseña' },
      { status: 500 }
    );
  }
}
