import React, { Suspense } from "react";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import RecuperarContrasenaClient from "@/components/auth/RecuperarContrasenaClient";
import { Box, Text, Container } from "@radix-ui/themes";

export const metadata = {
  title: "Recuperar Contraseña - Yaku",
  description: "Recupera tu contraseña mediante el código de confirmación enviado a tu correo",
};

export default async function RecuperarContrasenaPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard/agricultor");
  }

  return (
    <div className="auth-page-wrapper">
      <Container size="1" style={{ width: "100%" }}>
        <Box style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              margin: "0 auto 1rem",
              background: "white",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
            }}
          >
            🌊
          </div>
          <h1
            style={{
              color: "white",
              marginBottom: "0.5rem",
              fontSize: "2.5rem",
              fontWeight: "bold",
            }}
          >
            Yaku
          </h1>
          <Text size="3" style={{ color: "rgba(255, 255, 255, 0.8)" }}>
            Sistema de riego inteligente · Lima, Perú
          </Text>
        </Box>

        <Box style={{ display: "flex", justifyContent: "center" }}>
          <Suspense
            fallback={
              <div style={{ color: "white", textAlign: "center" }}>
                Cargando recuperación...
              </div>
            }
          >
            <RecuperarContrasenaClient />
          </Suspense>
        </Box>

        <Box style={{ textAlign: "center", marginTop: "2rem" }}>
          <Text size="2" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
            ¿Problemas para acceder? → soporte@yaku.pe
          </Text>
        </Box>
      </Container>
    </div>
  );
}
