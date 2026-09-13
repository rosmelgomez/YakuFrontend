"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Card, Box, Flex, Text, Button, TextField, Callout } from "@radix-ui/themes";
import { CheckCircledIcon, ExclamationTriangleIcon, ReloadIcon } from "@radix-ui/react-icons";
import { Loader2, Mail, KeyRound, ArrowRight, ShieldCheck } from "lucide-react";

export default function VerificarCorreoClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialEmail = searchParams.get("correo") || searchParams.get("email") || "";
  const initialCode = searchParams.get("codigo") || searchParams.get("token") || "";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState(initialCode);
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState<boolean>(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Focus input on load
  useEffect(() => {
    if (codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, []);

  // Countdown timer for resending code
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const procesarVerificacion = async (codigoAProcesar: string, correoAProcesar: string) => {
    const cleanCode = codigoAProcesar.trim();
    const cleanEmail = correoAProcesar.trim().toLowerCase();

    if (!cleanCode) {
      setErrorMessage("Por favor, ingresa el código de confirmación de 6 dígitos.");
      setStatus("error");
      return;
    }

    if (cleanCode.length < 4) {
      setErrorMessage("El código de confirmación es demasiado corto.");
      setStatus("error");
      return;
    }

    setStatus("verifying");
    setErrorMessage(null);
    setResendSuccess(null);

    try {
      // Iniciar sesión y autenticar al usuario mediante el código de confirmación
      const result = await signIn("credentials", {
        correo: cleanEmail || undefined,
        token: cleanCode,
        redirect: false,
      });

      if (result?.error) {
        setStatus("error");
        setErrorMessage(
          result.error === "CredentialsSignin"
            ? "Código de confirmación incorrecto o expirado. Por favor, verifica el código ingresado o solicita un nuevo reenvío."
            : result.error
        );
      } else if (result?.ok) {
        setStatus("success");
        setTimeout(() => {
          window.location.href = "/dashboard/agricultor";
        }, 800);
      }
    } catch {
      setStatus("error");
      setErrorMessage("Ocurrió un error al procesar la verificación. Inténtalo de nuevo.");
    }
  };

  const handleReenviarCodigo = async () => {
    if (!email.trim()) {
      setErrorMessage("Ingresa tu correo electrónico para reenviar el código.");
      return;
    }

    setIsResending(true);
    setErrorMessage(null);
    setResendSuccess(null);

    try {
      const res = await fetch("/api/auth/reenviar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.message || "No se pudo reenviar el código.");
      } else {
        setResendSuccess("¡Código reenviado! Revisa tu bandeja de entrada o carpeta de spam.");
        setResendCooldown(60); // 60 segundos de enfriamiento
      }
    } catch {
      setErrorMessage("Error de conexión al reenviar el código.");
    } finally {
      setIsResending(false);
    }
  };

  // Auto-verificar si el código llega en URL con 6 dígitos
  useEffect(() => {
    if (initialCode && initialCode.length === 6) {
      procesarVerificacion(initialCode, initialEmail);
    }
  }, [initialCode]);

  return (
    <Card className="w-full max-w-md" style={{ padding: "2.5rem", textAlign: "center" }}>
      <Flex direction="column" gap="4" align="center">
        {/* ICONO CENTRAL */}
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background:
              status === "success"
                ? "rgba(34, 197, 94, 0.15)"
                : status === "error"
                ? "rgba(239, 68, 68, 0.15)"
                : "rgba(13, 148, 136, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color:
              status === "success"
                ? "#22c55e"
                : status === "error"
                ? "#ef4444"
                : "#0d9488",
          }}
        >
          {status === "verifying" ? (
            <Loader2 size={32} className="animate-spin" />
          ) : status === "success" ? (
            <CheckCircledIcon width={34} height={34} />
          ) : status === "error" ? (
            <ExclamationTriangleIcon width={34} height={34} />
          ) : (
            <KeyRound size={32} />
          )}
        </div>

        {/* TÍTULO Y DESCRIPCIÓN */}
        <Box>
          <Text size="5" weight="bold" style={{ color: "white" }} as="div">
            {status === "verifying"
              ? "Verificando código..."
              : status === "success"
              ? "¡Cuenta Verificada!"
              : "Verifica tu Cuenta"}
          </Text>
          <Text size="2" color="gray" mt="1" as="div">
            {status === "success"
              ? "Tu identidad ha sido confirmada con éxito. Ingresando al panel..."
              : email
              ? `Hemos enviado un código de confirmación de 6 dígitos a:`
              : "Ingresa el código de confirmación de 6 dígitos enviado a tu correo."}
          </Text>
          {email && status !== "success" && (
            <Text size="2" weight="bold" style={{ color: "#38bdf8", wordBreak: "break-all" }} mt="1" as="div">
              {email}
            </Text>
          )}
        </Box>

        {/* MENSAJES DE ÉXITO O ERROR */}
        {status === "success" && (
          <Callout.Root color="green" style={{ width: "100%" }}>
            <Callout.Icon>
              <CheckCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              Redirigiendo a tu Dashboard de Riego Inteligente...
            </Callout.Text>
          </Callout.Root>
        )}

        {status === "error" && errorMessage && (
          <Callout.Root color="red" style={{ width: "100%", textAlign: "left" }}>
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>{errorMessage}</Callout.Text>
          </Callout.Root>
        )}

        {resendSuccess && (
          <Callout.Root color="green" style={{ width: "100%", textAlign: "left" }}>
            <Callout.Icon>
              <CheckCircledIcon />
            </Callout.Icon>
            <Callout.Text>{resendSuccess}</Callout.Text>
          </Callout.Root>
        )}

        {/* FORMULARIO DE INGRESO DE CÓDIGO */}
        {status !== "success" && (
          <Box style={{ width: "100%" }} mt="2">
            {!initialEmail && (
              <Box mb="3" style={{ textAlign: "left" }}>
                <label style={{ display: "block", marginBottom: "4px" }}>
                  <Text size="2" color="gray">
                    Correo electrónico registrado:
                  </Text>
                </label>
                <TextField.Root
                  placeholder="ejemplo@correo.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: "100%" }}
                >
                  <TextField.Slot>
                    <Mail size={16} style={{ color: "#94a3b8" }} />
                  </TextField.Slot>
                </TextField.Root>
              </Box>
            )}

            <label style={{ display: "block", textAlign: "left", marginBottom: "8px" }}>
              <Text size="2" weight="medium" style={{ color: "#e2e8f0" }}>
                Código de 6 dígitos:
              </Text>
            </label>

            <TextField.Root
              ref={codeInputRef}
              placeholder="123456"
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(val);
                if (val.length === 6 && email) {
                  procesarVerificacion(val, email);
                }
              }}
              style={{
                width: "100%",
                fontSize: "1.5rem",
                textAlign: "center",
                letterSpacing: "0.5rem",
                fontWeight: "bold",
                marginBottom: "1.25rem",
                padding: "0.5rem",
              }}
              inputMode="numeric"
              maxLength={6}
            />

            <Button
              style={{ width: "100%", cursor: "pointer" }}
              size="3"
              color="teal"
              disabled={code.length < 4 || status === "verifying"}
              onClick={() => procesarVerificacion(code, email)}
            >
              {status === "verifying" ? (
                <>
                  <Loader2 size={18} className="animate-spin" style={{ marginRight: "6px" }} />
                  Verificando...
                </>
              ) : (
                <>
                  <ShieldCheck size={18} style={{ marginRight: "6px" }} />
                  Verificar y Entrar al Dashboard
                </>
              )}
            </Button>

            {/* SECCIÓN REENVIAR CÓDIGO */}
            <Flex justify="between" align="center" mt="4" pt="3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <Text size="2" color="gray">
                ¿No recibiste el correo?
              </Text>
              <Button
                variant="ghost"
                size="1"
                disabled={resendCooldown > 0 || isResending}
                onClick={handleReenviarCodigo}
                style={{ cursor: resendCooldown > 0 ? "not-allowed" : "pointer" }}
              >
                {isResending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" style={{ marginRight: "4px" }} />
                    Enviando...
                  </>
                ) : resendCooldown > 0 ? (
                  `Reenviar en ${resendCooldown}s`
                ) : (
                  <>
                    <ReloadIcon style={{ marginRight: "4px" }} />
                    Reenviar código
                  </>
                )}
              </Button>
            </Flex>
          </Box>
        )}

        {/* BOTÓN DIRECTO AL DASHBOARD TRAS ÉXITO */}
        {status === "success" && (
          <Button
            style={{ width: "100%", cursor: "pointer" }}
            size="3"
            color="green"
            onClick={() => {
              window.location.href = "/dashboard/agricultor";
            }}
          >
            Ir al Dashboard Ahora
            <ArrowRight size={16} style={{ marginLeft: "6px" }} />
          </Button>
        )}

        {/* ENLACES SECUNDARIOS */}
        <Flex gap="3" justify="center" mt="2">
          <Link href="/auth/login" style={{ color: "#94a3b8", fontSize: "0.875rem", textDecoration: "none" }}>
            ← Volver a Iniciar Sesión
          </Link>
        </Flex>
      </Flex>
    </Card>
  );
}
