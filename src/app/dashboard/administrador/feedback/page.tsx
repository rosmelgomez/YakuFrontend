import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import nextDynamic from "next/dynamic";
import { Box } from "@radix-ui/themes";
import { authOptions } from "@/lib/auth";
import DashboardSkeleton from "@/components/layout/DashboardSkeleton";
import { listarPreguntasFeedback } from "@/actions/feedback";

export const metadata = {
  title: "Feedback - Administrador Yaku",
};

export const dynamic = "force-dynamic";

const FeedbackAdminClient = nextDynamic(() => import("@/components/administrador/feedback/FeedbackAdminClient"), {
  loading: () => <DashboardSkeleton variant="admin" />,
});

export default async function AdminFeedbackPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");
  if (session.user.rol !== "administrador") redirect("/dashboard/agricultor");

  const preguntas = await listarPreguntasFeedback(true).catch(() => []);

  return (
    <Box className="page-content" style={{ padding: "2rem 0" }}>
      <Box style={{ width: "100%", maxWidth: "100%", paddingLeft: "16px", paddingRight: "16px" }}>
        <FeedbackAdminClient initialPreguntas={preguntas} />
      </Box>
    </Box>
  );
}
