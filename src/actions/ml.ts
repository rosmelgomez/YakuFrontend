"use server";

import { revalidatePath } from 'next/cache';
import { fetchFromFastAPI } from '@/lib/bff';

export async function solicitarPrediccionML(
  data: {
    humedad_suelo: number;
    humedad_ambiente: number;
    temperatura_ambiente: number;
    temperatura_suelo: number;
  },
  idCultivo?: number
) {
  try {
    const url = idCultivo ? `/ml/prediccion?id_cultivo=${idCultivo}` : '/ml/prediccion';
    const res = await fetchFromFastAPI(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
 
    if (!res.ok) {
      const errorMsg = await res.text();
      return { success: false, error: errorMsg || 'Error al invocar FastAPI' };
    }
 
    const result = await res.json();
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error de conexión' };
  }
}

export async function seleccionarModeloML(idModelo: number, idCultivo: number) {
  try {
    const res = await fetchFromFastAPI(`/ml/models/select/${idModelo}?id_cultivo=${idCultivo}`, {
      method: 'POST',
    });

    if (!res.ok) {
      const errorMsg = await res.text();
      return { success: false, error: errorMsg || 'Error al seleccionar el modelo en FastAPI' };
    }

    revalidatePath('/dashboard/agricultor/control');
    const result = await res.json();
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error de conexión' };
  }
}

export async function reentrenarModeloML() {
  try {
    const res = await fetchFromFastAPI('/ml/models/retrain', {
      method: 'POST',
    });

    if (!res.ok) {
      const errorMsg = await res.text();
      return { success: false, error: errorMsg || 'Error al solicitar reentrenamiento' };
    }

    revalidatePath('/dashboard/agricultor/ml');
    const result = await res.json();
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error de conexión' };
  }
}
