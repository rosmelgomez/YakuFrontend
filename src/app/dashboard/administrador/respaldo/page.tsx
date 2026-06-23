import AdminSectionPage from "../_shared/AdminSectionPage";

export const metadata = {
  title: "Respaldo - Administrador Yaku",
};

export const dynamic = "force-dynamic";

export default function RespaldoPage() {
  return <AdminSectionPage activeTab="respaldo" />;
}
