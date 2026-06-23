// src/app/api/admin/backup/route.ts
import { NextResponse } from 'next/server';
import { fetchFromFastAPI } from '@/lib/bff';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || (session.user as any).rol !== 'administrador') {
    return new NextResponse('No autorizado', { status: 401 });
  }

  try {
    const res = await fetchFromFastAPI('/admin/backup');
    if (!res.ok) {
      return new NextResponse('Error al generar backup en FastAPI', { status: res.status });
    }

    // Retornar la respuesta como stream para descarga
    return new Response(res.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/sql',
        'Content-Disposition': 'attachment; filename=yaku_backup.sql',
      },
    });
  } catch (error: any) {
    return new NextResponse(error.message || 'Error interno del servidor', { status: 500 });
  }
}
