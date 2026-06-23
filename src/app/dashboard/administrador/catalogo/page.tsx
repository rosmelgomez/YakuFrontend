import AdminSectionPage from "../_shared/AdminSectionPage";

export const metadata = {
  title: "Catalogo - Administrador Yaku",
};

export const dynamic = "force-dynamic";

export default function CatalogoPage() {
  return <AdminSectionPage activeTab="catalogo" />;
}
