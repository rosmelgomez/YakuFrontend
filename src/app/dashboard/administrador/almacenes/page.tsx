import AdminSectionPage from "../_shared/AdminSectionPage";

export const metadata = {
  title: "Almacenes - Administrador Yaku",
};

export const dynamic = "force-dynamic";

export default function AlmacenesPage() {
  return <AdminSectionPage activeTab="almacenes" />;
}
