"use client";

import { useTransition } from "react";
import { Box, Button, Card, Flex, Text } from "@radix-ui/themes";
import { HardDrive } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function RespaldoClient() {
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth();
  const esAdminReal = user?.rol === "administrador";

  const handleTriggerBackup = async () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/backup");
        if (!res.ok) throw new Error("Error en la descarga");
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const extension = esAdminReal ? "sql" : "json";
        a.download = `yaku_backup_${new Date().toISOString().split("T")[0]}.${extension}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (err: any) {
        alert(`Error al generar backup: ${err.message}`);
      }
    });
  };

  return (
    <Box style={{ opacity: isPending ? 0.6 : 1, transition: "opacity 0.2s" }}>
      <Flex direction="column" gap="4" mb="5">
        <Box>
          <Text size={{ initial: "5", sm: "6" }} weight="bold" color="indigo" as="div">Respaldo</Text>
          <Text size={{ initial: "1", sm: "2" }} color="gray" style={{ fontFamily: "monospace" }}>
            {esAdminReal
              ? "Genera copias de seguridad completas desde el backend."
              : "Descarga un respaldo de tus propios datos (no incluye información de otros usuarios)."}
          </Text>
        </Box>
      </Flex>
      <Card size={{ initial: "2", sm: "3" }} style={{ background: "var(--surface-mockup)", borderColor: "var(--border-mockup)", borderRadius: "16px" }}>
        <Flex direction="column" gap="4" align="center" justify="center" p={{ initial: "3", sm: "5" }}>
          <HardDrive className="w-12 h-12 sm:w-16 sm:h-16" color="#818cf8" style={{ filter: "drop-shadow(0 0 10px rgba(129, 140, 248, 0.3))" }} />
          <Box style={{ textAlign: "center" }}>
            <Text size={{ initial: "3", sm: "4" }} weight="bold" style={{ color: "white" }} as="div" mb="2">
              {esAdminReal ? "Copia de Seguridad de la Base de Datos" : "Copia de Seguridad de tus Datos"}
            </Text>
            <Text size={{ initial: "1", sm: "2" }} color="gray">
              {esAdminReal
                ? "Descargue un archivo de respaldo completo de la base de datos."
                : "Descarga tus cultivos, dispositivos, riegos, alertas y demás datos vinculados a tu cuenta."}
            </Text>
          </Box>
          <Button size={{ initial: "2", sm: "3" }} color="indigo" onClick={handleTriggerBackup} disabled={isPending} style={{ cursor: "pointer" }}>
            {esAdminReal ? "Generar y Descargar Backup (.SQL)" : "Generar y Descargar mis Datos (.JSON)"}
          </Button>
        </Flex>
      </Card>
    </Box>
  );
}
