import AdminSectionPage from "../_shared/AdminSectionPage";

export const metadata = {
  title: "Dispositivos - Administrador Yaku",
};

export const dynamic = "force-dynamic";

export default function DispositivosPage() {
  return <AdminSectionPage activeTab="dispositivos" />;
}
