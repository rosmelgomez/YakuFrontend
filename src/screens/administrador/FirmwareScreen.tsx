// src/screens/administrador/FirmwareScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
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

  const loadData = useCallback(async () => {
    const [vRes, iRes, dRes, uRes, cRes] = await Promise.allSettled([
      listarVersionesFirmware(),
      listarInstalacionesFirmware(),
      listarDispositivos(),
      listarUsuarios(),
      listarTodosCultivos(),
    ]);
    if (vRes.status === 'fulfilled') setVersions(vRes.value || []);
    if (iRes.status === 'fulfilled') setInstallations(iRes.value || []);
    if (dRes.status === 'fulfilled') setDevices(dRes.value || []);
    if (uRes.status === 'fulfilled') setUsers(uRes.value || []);
    if (cRes.status === 'fulfilled') setCrops(cRes.value || []);

    const errs = [vRes, iRes, dRes, uRes, cRes]
      .filter((result) => result.status === 'rejected')
      .map((result: any) => (result.reason instanceof Error ? result.reason.message : 'No se pudo cargar información del backend'));
    setLoadErrors(errs);
  }, []);

  useEffect(() => {
    let isMounted = true;
    loadData().finally(() => {
      if (isMounted) setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [loadData]);

  if (loading) {
    return (
      <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
        <DashboardSkeleton variant="admin" />
      </Box>
    );
  }

  return (
    <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
      <FirmwareClient
        initialVersions={versions}
        initialInstallations={installations}
        devices={devices}
        users={users}
        crops={crops}
        loadErrors={loadErrors}
        onRefresh={loadData}
      />
    </Box>
  );
}
