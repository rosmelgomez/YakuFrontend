import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { Box } from "@radix-ui/themes";
import { authOptions } from "@/lib/auth";
import {
  listarComponentes,
  listarDispositivos,
  listarTiposComponente,
  listarTiposDispositivo,
  listarTiposMetrica,
  listarUsuarios,
} from "@/actions/admin";
import { listarFuentesAgua, listarTodosCultivos } from "@/actions/crops";
import { listarAlmacenes } from "@/actions/almacenes";
import DispositivosClient from "@/components/administrador/dispositivos/DispositivosClient";

export const metadata = {
  title: "Dispositivos - Administrador Yaku",
};

export const dynamic = "force-dynamic";

export default async function DispositivosPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");
  if ((session.user as { rol?: string }).rol !== "administrador") redirect("/dashboard/agricultor");

  const [
    usersResult,
    devicesResult,
    cropsResult,
    deviceTypesResult,
    componentTypesResult,
    storesResult,
    componentsResult,
    waterSourcesResult,
    metricsResult,
  ] = await Promise.allSettled([
    listarUsuarios(),
    listarDispositivos(),
    listarTodosCultivos(),
    listarTiposDispositivo(),
    listarTiposComponente(),
    listarAlmacenes(),
    listarComponentes(),
    listarFuentesAgua(),
    listarTiposMetrica(),
  ]);

  return (
    <Box className="page-content" style={{ padding: "2rem 0" }}>
      <Box style={{ width: "100%", maxWidth: "100%", paddingLeft: 16, paddingRight: 16 }}>
        <DispositivosClient
          initialUsers={usersResult.status === "fulfilled" ? usersResult.value : []}
          initialDevices={devicesResult.status === "fulfilled" ? devicesResult.value : []}
          initialCrops={cropsResult.status === "fulfilled" ? cropsResult.value : []}
          tiposDispositivo={deviceTypesResult.status === "fulfilled" ? deviceTypesResult.value : []}
          tiposComponente={componentTypesResult.status === "fulfilled" ? componentTypesResult.value : []}
          initialAlmacenes={storesResult.status === "fulfilled" ? storesResult.value : []}
          initialComponents={componentsResult.status === "fulfilled" ? componentsResult.value : []}
          fuentesAgua={waterSourcesResult.status === "fulfilled" ? waterSourcesResult.value : []}
          metricas={metricsResult.status === "fulfilled" ? metricsResult.value : []}
        />
      </Box>
    </Box>
  );
}
