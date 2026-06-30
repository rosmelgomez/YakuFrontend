import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import nextDynamic from "next/dynamic";
import { Box } from "@radix-ui/themes";
import { authOptions } from "@/lib/auth";
import DashboardSkeleton from "@/components/layout/DashboardSkeleton";
import { getCultivosBase } from "@/services/cultivos-base";
import type { CultivoBase } from "@/services/cultivos-base";
import { listarFeedbackPropios, listarPreguntasFeedback } from "@/actions/feedback";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Feedback - Yaku",
  description: "Retroalimentacion de agricultores sobre el sistema Yaku",
};

const FeedbackClient = nextDynamic(() => import("@/components/agricultor/feedback/FeedbackClient"), {
  loading: () => <DashboardSkeleton variant="form" />,
});

export default async function FeedbackPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");

  let cultivosBase: CultivoBase[] = [];
  let feedback = [];
  let preguntas = [];

  try {
    [cultivosBase, feedback, preguntas] = await Promise.all([
      getCultivosBase(),
      listarFeedbackPropios(),
      listarPreguntasFeedback(false),
    ]);
  } catch {
    return <div style={{ color: "white", padding: "2rem" }}>Error al conectar con el servidor backend.</div>;
  }

  return (
    <Box className="page-content" style={{ padding: "2rem 0" }}>
      <Box style={{ width: "100%", maxWidth: "100%", paddingLeft: "16px", paddingRight: "16px" }}>
        <FeedbackClient cultivos={cultivosBase} preguntas={preguntas} initialFeedback={feedback} />
      </Box>
    </Box>
  );
}
