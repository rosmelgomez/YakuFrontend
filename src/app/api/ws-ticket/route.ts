import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { createBffToken } from "@/lib/bff-token";


export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }
  return NextResponse.json({
    ticket: createBffToken(session.user.id, "yaku-websocket", 30),
  });
}
