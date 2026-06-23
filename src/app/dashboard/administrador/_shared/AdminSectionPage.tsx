import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import { authOptions } from '@/lib/auth';
import { Box } from '@radix-ui/themes';
import DashboardSkeleton from '@/components/layout/DashboardSkeleton';
import {
  listarUsuarios,
  listarDispositivos,
  listarTiposDispositivo,
  listarTiposComponente,
  listarComponentes,
  listarPlantas,
  listarTiposMetrica
} from '@/actions/admin';
import {
  listarRegiones,
  listarTodasProvincias,
  listarTodosDistritos,
  listarTodosCultivos,
  listarFuentesAgua
} from '@/actions/crops';
import { listarAlmacenes } from '@/actions/almacenes';

export type AdminSection = 'usuarios' | 'dispositivos' | 'catalogo' | 'respaldo' | 'almacenes';

const adminSectionClients: Record<AdminSection, ComponentType<any>> = {
  usuarios: nextDynamic(() => import('@/components/administrador/usuarios/UsuariosClient'), {
    loading: () => <DashboardSkeleton variant="admin" />,
  }),
  dispositivos: nextDynamic(() => import('@/components/administrador/dispositivos/DispositivosClient'), {
    loading: () => <DashboardSkeleton variant="admin" />,
  }),
  catalogo: nextDynamic(() => import('@/components/administrador/catalogo/CatalogoClient'), {
    loading: () => <DashboardSkeleton variant="admin" />,
  }),
  respaldo: nextDynamic(() => import('@/components/administrador/respaldo/RespaldoClient'), {
    loading: () => <DashboardSkeleton variant="admin" />,
  }),
  almacenes: nextDynamic(() => import('@/components/administrador/almacenes/AlmacenesClient'), {
    loading: () => <DashboardSkeleton variant="admin" />,
  }),
};

export default async function AdminSectionPage({ activeTab }: { activeTab: AdminSection }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/auth/login');
  }

  const userRol = (session.user as any).rol;
  if (userRol !== 'administrador') {
    redirect('/dashboard/agricultor');
  }

  const data = {
    users: [] as any[],
    devices: [] as any[],
    crops: [] as any[],
    tiposDispositivo: [] as any[],
    tiposComponente: [] as any[],
    catalogPlantas: [] as any[],
    regiones: [] as any[],
    provincias: [] as any[],
    distritos: [] as any[],
    almacenes: [] as any[],
    components: [] as any[],
    fuentesAgua: [] as any[],
    metricas: [] as any[],
  };

  if (activeTab === 'usuarios') {
    const [users, devices, crops] = await Promise.all([
      listarUsuarios().catch(() => []),
      listarDispositivos().catch(() => []),
      listarTodosCultivos().catch(() => []),
    ]);
    data.users = users;
    data.devices = devices;
    data.crops = crops;
  }

  if (activeTab === 'dispositivos') {
    const [
      users,
      devices,
      crops,
      tiposDispositivo,
      tiposComponente,
      almacenes,
      components,
      fuentesAgua,
      metricas,
    ] = await Promise.all([
      listarUsuarios().catch(() => []),
      listarDispositivos().catch(() => []),
      listarTodosCultivos().catch(() => []),
      listarTiposDispositivo().catch(() => []),
      listarTiposComponente().catch(() => []),
      listarAlmacenes().catch(() => []),
      listarComponentes().catch(() => []),
      listarFuentesAgua().catch(() => []),
      listarTiposMetrica().catch(() => []),
    ]);
    data.users = users;
    data.devices = devices;
    data.crops = crops;
    data.tiposDispositivo = tiposDispositivo;
    data.tiposComponente = tiposComponente;
    data.almacenes = almacenes;
    data.components = components;
    data.fuentesAgua = fuentesAgua;
    data.metricas = metricas;
  }

  if (activeTab === 'catalogo') {
    const [catalogPlantas, regiones, provincias, distritos, metricas] = await Promise.all([
      listarPlantas().catch(() => []),
      listarRegiones().catch(() => []),
      listarTodasProvincias().catch(() => []),
      listarTodosDistritos().catch(() => []),
      listarTiposMetrica().catch(() => []),
    ]);
    data.catalogPlantas = catalogPlantas;
    data.regiones = regiones;
    data.provincias = provincias;
    data.distritos = distritos;
    data.metricas = metricas;
  }

  if (activeTab === 'almacenes') {
    const [almacenes, devices, regiones, provincias, distritos] = await Promise.all([
      listarAlmacenes().catch(() => []),
      listarDispositivos().catch(() => []),
      listarRegiones().catch(() => []),
      listarTodasProvincias().catch(() => []),
      listarTodosDistritos().catch(() => []),
    ]);
    data.almacenes = almacenes;
    data.devices = devices;
    data.regiones = regiones;
    data.provincias = provincias;
    data.distritos = distritos;
  }

  const AdminSectionClient = adminSectionClients[activeTab];

  return (
    <Box className="page-content" style={{ padding: '2rem 0' }}>
      <Box style={{ width: '100%', maxWidth: '100%', paddingLeft: '16px', paddingRight: '16px' }}>
        <AdminSectionClient
          initialUsers={data.users}
          initialDevices={data.devices}
          initialCrops={data.crops}
          tiposDispositivo={data.tiposDispositivo}
          tiposComponente={data.tiposComponente}
          catalogPlantas={data.catalogPlantas}
          regiones={data.regiones}
          provincias={data.provincias}
          distritos={data.distritos}
          initialAlmacenes={data.almacenes}
          initialComponents={data.components}
          fuentesAgua={data.fuentesAgua}
          metricas={data.metricas}
          activeTab={activeTab}
        />
      </Box>
    </Box>
  );
}
