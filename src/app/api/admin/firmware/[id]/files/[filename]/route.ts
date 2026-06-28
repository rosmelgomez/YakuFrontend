import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { fetchFromFastAPI } from "@/lib/bff";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; filename: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user as { rol?: string }).rol !== "administrador") {
    return NextResponse.json({ detail: "No autorizado" }, { status: 403 });
  }
  const { id, filename } = await context.params;
  const response = await fetchFromFastAPI(
    `/firmware/versions/${encodeURIComponent(id)}/files/${encodeURIComponent(filename)}`,
  );
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail = payload?.detail || "Segmento no disponible";
    return NextResponse.json({ detail }, { status: response.status });
  }
  return new NextResponse(response.body, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": response.headers.get("content-length") || "",
      "Cache-Control": "no-store",
    },
  });
}
