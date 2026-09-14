// src/screens/administrador/FirmwareScreen.tsx
import React, { useEffect, useState } from 'react';
import { Box } from '@radix-ui/themes';
import { listarDispositivos, listarUsuarios } from '@/actions/admin';
import { listarTodosCultivos } from '@/actions/crops';
import { listarInstalacionesFirmware, listarVersionesFirmware } from '@/actions/firmware';
import DashboardSkeleton from '@/components/layout/DashboardSkeleton';
import FirmwareClient from '@/components/administrador/firmware/FirmwareClient';

export default function FirmwareScreen() {
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState<any[]>([]);
  const [installations, setInstallations] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    Promise.allSettled([
      listarVersionesFirmware(),
      listarInstalacionesFirmware(),
      listarDispositivos(),
      listarUsuarios(),
      listarTodosCultivos(),
    ]).then(([vRes, iRes, dRes, uRes, cRes]) => {
      if (!isMounted) return;
      if (vRes.status === 'fulfilled') setVersions(vRes.value || []);
      if (iRes.status === 'fulfilled') setInstallations(iRes.value || []);
      if (dRes.status === 'fulfilled') setDevices(dRes.value || []);
      if (uRes.status === 'fulfilled') setUsers(uRes.value || []);
      if (cRes.status === 'fulfilled') setCrops(cRes.value || []);

      const errs = [vRes, iRes, dRes, uRes, cRes]
        .filter((r) => r.status === 'rejected')
        .map((r: any) => (r.reason instanceof Error ? r.reason.message : 'No se pudo cargar información del backend'));
      setLoadErrors(errs);
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <Box className="page-content" px={{ initial: "4", sm: "5", md: "6" }} py={{ initial: "4", sm: "5", md: "6" }}>
        <DashboardSkeleton variant="admin" />
      </Box>
    );
  }

  return (
    <Box className="page-content" px={{ initial: "4", sm: "5", md: "6" }} py={{ initial: "4", sm: "5", md: "6" }}>
      <FirmwareClient
        initialVersions={versions}
        initialInstallations={installations}
        devices={devices}
        users={users}
        crops={crops}
        loadErrors={loadErrors}
      />
    </Box>
  );
}
