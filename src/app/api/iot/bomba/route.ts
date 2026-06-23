// src/app/api/iot/bomba/route.ts
import { NextResponse } from "next/server";
import { fetchFromFastAPI } from "@/lib/bff";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { idTelemetria, estado } = body;

    if (!idTelemetria) {
      return NextResponse.json({ error: "Falta el ID de telemetría" }, { status: 400 });
    }

    const res = await fetchFromFastAPI("/control/bomba/toggle-by-telemetria", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idTelemetria: parseInt(idTelemetria, 10), estado })
    });

    if (!res.ok) {
      const errMsg = await res.text();
      return NextResponse.json({ error: errMsg || "Error al conmutar bomba en FastAPI" }, { status: res.status });
    }

    const result = await res.json();
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 });
  }
}
