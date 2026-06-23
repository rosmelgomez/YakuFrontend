"use client";

import { useTransition } from "react";
import { Box, Button, Card, Flex, Text } from "@radix-ui/themes";
import { HardDrive } from "lucide-react";

export default function RespaldoClient() {
  const [isPending, startTransition] = useTransition();

  const handleTriggerBackup = async () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/backup");
        if (!res.ok) throw new Error("Error en la descarga");
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `yaku_backup_${new Date().toISOString().split("T")[0]}.sql`;
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
      <Flex direction="column" gap="4" mb="6">
        <Box>
          <Text size="6" weight="bold" color="indigo" as="div">Respaldo</Text>
          <Text size="2" color="gray" style={{ fontFamily: "monospace" }}>Genera copias de seguridad desde el backend.</Text>
        </Box>
      </Flex>
      <Card size="3" style={{ background: "var(--surface-mockup)", borderColor: "var(--border-mockup)", borderRadius: "16px" }}>
        <Flex direction="column" gap="4" align="center" justify="center" p="5">
          <HardDrive size={64} color="#818cf8" style={{ filter: "drop-shadow(0 0 10px rgba(129, 140, 248, 0.3))" }} />
          <Box style={{ textAlign: "center" }}>
            <Text size="4" weight="bold" style={{ color: "white" }} as="div" mb="2">Copia de Seguridad de la Base de Datos</Text>
            <Text size="2" color="gray">Descargue un archivo comprimido de respaldo completo de la base de datos.</Text>
          </Box>
          <Button size="3" color="indigo" onClick={handleTriggerBackup} disabled={isPending} style={{ cursor: "pointer", padding: "12px 24px" }}>
            Generar y Descargar Backup (.SQL)
          </Button>
        </Flex>
      </Card>
    </Box>
  );
}
