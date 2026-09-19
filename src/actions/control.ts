// src/actions/control.ts


import { revalidatePath } from "next/cache";
import { fetchFromFastAPI } from "@/lib/bff";

async function parseErrorText(res: any): Promise<string> {
  try {
    const text = await res.text();
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.detail === "string") {
        return parsed.detail;
      }
      if (parsed && typeof parsed.message === "string") {
        return parsed.message;
      }
    } catch {
      // Not JSON
    }
    return text || res.statusText || "Error en el servidor";
  } catch {
    return "Error desconocido";
  }
}


export async function actualizarTiempoMaximoRele(idCultivo: number, duracionMaxMinutos: number) {
  try {
    const res = await fetchFromFastAPI("/control/configuracion/rele", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idCultivo, duracionMaxMinutos })
    });
    if (!res.ok) {
      const errorMsg = await parseErrorText(res);
      return { success: false, error: errorMsg };
    }
    revalidatePath('/dashboard/agricultor/control');
    revalidatePath('/dashboard/agricultor');
    const data = await res.json();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar el tiempo maximo del rele" };
  }
}

export async function actualizarCooldownRiego(idCultivo: number, cooldownMinutos: number) {
  try {
    const res = await fetchFromFastAPI("/control/configuracion/cooldown", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idCultivo, cooldownMinutos })
    });
    if (!res.ok) {
      const errorMsg = await parseErrorText(res);
      return { success: false, error: errorMsg };
    }
    revalidatePath('/dashboard/agricultor/control');
    revalidatePath('/dashboard/agricultor');
    const data = await res.json();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar el cooldown de riego" };
  }
}

export async function toggleCapturaDatos(userId: number, dispositivoId: number, active: boolean) {
  try {
    const res = await fetchFromFastAPI(`/dispositivos/funcionamiento/${dispositivoId}/${active ? 'activo' : 'desactivado'}`, {
      method: 'POST'
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || 'Error en comunicación con backend FastAPI');
    }

    revalidatePath('/dashboard/agricultor/control');
    revalidatePath('/dashboard/agricultor');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error de red o comunicación' };
  }
}

export async function calibrarSensor(dispositivoId: number, pinGpio: number, offset: number) {
  try {
    const res = await fetchFromFastAPI(`/dispositivos/calibrar/${dispositivoId}/${pinGpio}/${offset}`, {
      method: "POST"
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || "Error en comunicación con backend FastAPI");
    }
    const data = await res.json();
    revalidatePath('/dashboard/agricultor/control');
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al calibrar" };
  }
}

export async function obtenerDatosControlPorCultivo(userId: number, idCultivo: number) {
  try {
    const { getControlData } = await import("@/services/control");
    const { getAlertasData } = await import("@/services/alertas");
    
    const [cData, aData] = await Promise.all([
      getControlData(userId, idCultivo),
      getAlertasData(userId, idCultivo).catch(() => ({ umbrales: [] })),
    ]);

    return {
      success: true,
      data: {
        controlData: cData,
        umbrales: aData.umbrales,
        modelosML: []
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al cargar datos" };
  }
}

export async function ejecutarPrediccionEnVivo(userId: number, idCultivo: number) {
  try {
    const res = await fetchFromFastAPI(`/ml/predict-live/${idCultivo}`, {
      method: 'POST'
    });

    if (!res.ok) {
      const errorText = await parseErrorText(res);
      return { success: false, error: errorText };
    }

    revalidatePath('/dashboard/agricultor/control');
    revalidatePath('/dashboard/agricultor');
    return { success: true, data: await res.json() };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error de red o comunicación' };
  }
}

export async function listarHorariosRiego(idAsignacion: number) {
  try {
    const res = await fetchFromFastAPI(`/horarios-riego?id_asignacion=${idAsignacion}`);
    if (!res.ok) {
      const errorMsg = await parseErrorText(res);
      return { success: false, error: errorMsg };
    }
    return { success: true, data: await res.json() };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al listar los horarios" };
  }
}

export async function crearHorarioRiego(payload: {
  idAsignacion: number;
  siempreActivo?: boolean;
  horaInicio?: string;
  horaFin?: string;
  diasSemana: number[];
  activo?: boolean;
}) {
  try {
    const res = await fetchFromFastAPI(`/horarios-riego`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_asignacion: payload.idAsignacion,
        siempre_activo: payload.siempreActivo ?? false,
        hora_inicio: payload.horaInicio ?? null,
        hora_fin: payload.horaFin ?? null,
        dias_semana: payload.diasSemana,
        activo: payload.activo ?? true,
      }),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorText(res);
      return { success: false, error: errorMsg };
    }
    return { success: true, data: await res.json() };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al crear el horario" };
  }
}

export async function actualizarHorarioRiego(idHorario: number, payload: Partial<{
  siempreActivo: boolean;
  horaInicio: string;
  horaFin: string;
  diasSemana: number[];
  activo: boolean;
}>) {
  try {
    const body: Record<string, any> = {};
    if (payload.siempreActivo !== undefined) body.siempre_activo = payload.siempreActivo;
    if (payload.horaInicio !== undefined) body.hora_inicio = payload.horaInicio;
    if (payload.horaFin !== undefined) body.hora_fin = payload.horaFin;
    if (payload.diasSemana !== undefined) body.dias_semana = payload.diasSemana;
    if (payload.activo !== undefined) body.activo = payload.activo;

    const res = await fetchFromFastAPI(`/horarios-riego/${idHorario}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorText(res);
      return { success: false, error: errorMsg };
    }
    return { success: true, data: await res.json() };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar el horario" };
  }
}

export async function eliminarHorarioRiego(idHorario: number) {
  try {
    const res = await fetchFromFastAPI(`/horarios-riego/${idHorario}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const errorMsg = await parseErrorText(res);
      return { success: false, error: errorMsg };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al eliminar el horario" };
  }
}

export async function diagnosticarSensor(idAsignacion: number) {
  try {
    const res = await fetchFromFastAPI(`/dispositivos/asignaciones/${idAsignacion}/diagnostico`, {
      method: "GET"
    });
    if (!res.ok) {
      const errorMsg = await parseErrorText(res);
      return { success: false, error: errorMsg };
    }
    const data = await res.json();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al diagnosticar el sensor" };
  }
}

export async function detenerRiego(idCultivo: number, motivo: string = "cronometro_completado") {
  try {
    const res = await fetchFromFastAPI("/control/riego/detener", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idCultivo, motivo })
    });

    if (!res.ok) {
      const errorMsg = await parseErrorText(res);
      return { success: false, error: errorMsg };
    }

    revalidatePath('/dashboard/agricultor/control');
    revalidatePath('/dashboard/agricultor');
    const data = await res.json();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al detener riego" };
  }
}
