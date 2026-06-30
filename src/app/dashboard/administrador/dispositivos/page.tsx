import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import nextDynamic from "next/dynamic";
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
import DashboardSkeleton from "@/components/layout/DashboardSkeleton";

export const metadata = {
  title: "Dispositivos - Administrador Yaku",
};

export const dynamic = "force-dynamic";

const DispositivosClient = nextDynamic(() => import("@/components/administrador/dispositivos/DispositivosClient"), {
  loading: () => <DashboardSkeleton variant="admin" />,
});

export default async function DispositivosPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");
  if ((session.user as { rol?: string }).rol !== "administrador") redirect("/dashboard/agricultor");

  let devices = [];
  try {
    devices = await listarDispositivos();
  } catch (error) {
    console.error("Error al cargar dispositivos:", error);
  }

  return (
    <Box className="page-content" style={{ padding: "2rem 0" }}>
      <Box style={{ width: "100%", maxWidth: "100%", paddingLeft: 16, paddingRight: 16 }}>
        <DispositivosClient
          initialUsers={[]}
          initialDevices={devices}
          initialCrops={[]}
          tiposDispositivo={[]}
          tiposComponente={[]}
          initialAlmacenes={[]}
          initialComponents={[]}
          fuentesAgua={[]}
          metricas={[]}
        />
      </Box>
    </Box>
  );
}
