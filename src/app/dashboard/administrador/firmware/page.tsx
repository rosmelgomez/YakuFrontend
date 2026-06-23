import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Box } from "@radix-ui/themes";
import { listarDispositivos, listarUsuarios } from "@/actions/admin";
import { listarTodosCultivos } from "@/actions/crops";
import { listarInstalacionesFirmware, listarVersionesFirmware } from "@/actions/firmware";
import FirmwareClient from "@/components/administrador/firmware/FirmwareClient";

export const metadata = { title: "Firmware - Administrador Yaku" };
export const dynamic = "force-dynamic";

export default async function FirmwarePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");
  if ((session.user as { rol?: string }).rol !== "administrador") redirect("/dashboard/agricultor");

  const [versionsResult, installationsResult, devicesResult, usersResult, cropsResult] = await Promise.allSettled([
    listarVersionesFirmware(),
    listarInstalacionesFirmware(),
    listarDispositivos(),
    listarUsuarios(),
    listarTodosCultivos(),
  ]);

  const loadErrors = [versionsResult, installationsResult, devicesResult, usersResult, cropsResult]
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason instanceof Error ? result.reason.message : "No se pudo cargar informacion del backend");

  return (
    <Box className="page-content" style={{ padding: "2rem 0" }}>
      <Box style={{ width: "100%", maxWidth: "100%", paddingLeft: 16, paddingRight: 16 }}>
        <FirmwareClient
          initialVersions={versionsResult.status === "fulfilled" ? versionsResult.value : []}
          initialInstallations={installationsResult.status === "fulfilled" ? installationsResult.value : []}
          devices={devicesResult.status === "fulfilled" ? devicesResult.value : []}
          users={usersResult.status === "fulfilled" ? usersResult.value : []}
          crops={cropsResult.status === "fulfilled" ? cropsResult.value : []}
          loadErrors={loadErrors}
        />
      </Box>
    </Box>
  );
}
