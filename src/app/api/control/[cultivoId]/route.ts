import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getControlData } from "@/services/control";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cultivoId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }

  const { cultivoId } = await params;
  const idCultivo = parseInt(cultivoId, 10);
  if (isNaN(idCultivo)) {
    return NextResponse.json({ success: false, error: "ID de cultivo inválido" }, { status: 400 });
  }

  const userId = parseInt(session.user.id, 10);
  try {
    const data = await getControlData(userId, idCultivo);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Error al obtener datos de control" },
      { status: 500 }
    );
  }
}
