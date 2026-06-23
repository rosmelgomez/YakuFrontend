import AdminSectionPage from "../_shared/AdminSectionPage";

export const metadata = {
  title: "Usuarios - Administrador Yaku",
};

export const dynamic = "force-dynamic";

export default function UsuariosPage() {
  return <AdminSectionPage activeTab="usuarios" />;
}
