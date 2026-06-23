import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { fetchFromFastAPI } from "@/lib/bff";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user as { rol?: string }).rol !== "administrador") {
    return NextResponse.json({ detail: "No autorizado" }, { status: 403 });
  }
  const formData = await request.formData();
  const response = await fetchFromFastAPI("/firmware/versions", { method: "POST", body: formData });
  return new NextResponse(await response.arrayBuffer(), {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
  });
}
