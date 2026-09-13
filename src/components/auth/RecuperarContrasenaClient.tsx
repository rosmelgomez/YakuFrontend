"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  Box,
  Flex,
  Text,
  Button,
  TextField,
  Callout,
} from "@radix-ui/themes";
import {
  CheckCircledIcon,
  ExclamationTriangleIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import {
  Loader2,
  Mail,
  KeyRound,
  ArrowLeft,
  Lock,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

export default function RecuperarContrasenaClient() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("correo") || searchParams.get("email") || "";

  const [step, setStep] = useState<"solicitar" | "restablecer" | "exito">("solicitar");
  const [correo, setCorreo] = useState(initialEmail);
  const [codigo, setCodigo] = useState("");
  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Resend cooldown timer
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState(false);

  const codigoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  useEffect(() => {
    if (step === "restablecer" && codigoInputRef.current) {
      codigoInputRef.current.focus();
    }
  }, [step]);

  // Validaciones en tiempo real para la contraseña
  const tieneLongitud = nuevaContrasena.length >= 10;
  const tieneMayus = /[A-Z]/.test(nuevaContrasena);
  const tieneMinus = /[a-z]/.test(nuevaContrasena);
  const tieneNumero = /\d/.test(nuevaContrasena);
  const contrasenaValida = tieneLongitud && tieneMayus && tieneMinus && tieneNumero;
  const coincidenContrasenas =
    nuevaContrasena.length > 0 && nuevaContrasena === confirmarContrasena;

  const handleSolicitarCodigo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = correo.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMessage("Por favor, ingresa tu correo electrónico.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const res = await fetch("/api/auth/recuperar-contrasena/solicitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: cleanEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.message || "Error al solicitar el código de recuperación.");
      } else {
        setInfoMessage(data.message || "Si el correo está registrado, recibirás un código de recuperación.");
        setStep("restablecer");
        setResendCooldown(60);
      }
    } catch {
      setErrorMessage("Error de red al conectar con el servidor. Inténtalo nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReenviarCodigo = async () => {
    const cleanEmail = correo.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage("Ingresa tu correo para reenviar el código.");
      return;
    }

    setIsResending(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/recuperar-contrasena/solicitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: cleanEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.message || "No se pudo reenviar el código.");
      } else {
        setInfoMessage("¡Nuevo código enviado! Revisa tu bandeja de entrada o spam.");
        setResendCooldown(60);
      }
    } catch {
      setErrorMessage("Error de conexión al reenviar el código.");
    } finally {
      setIsResending(false);
    }
  };

  const handleRestablecerContrasena = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = correo.trim().toLowerCase();
    const cleanCodigo = codigo.trim();

    if (!cleanCodigo || cleanCodigo.length !== 6) {
      setErrorMessage("El código de recuperación debe tener 6 dígitos.");
      return;
    }

    if (!contrasenaValida) {
      setErrorMessage("La nueva contraseña no cumple con los requisitos de seguridad.");
      return;
    }

    if (nuevaContrasena !== confirmarContrasena) {
      setErrorMessage("Las contraseñas ingresadas no coinciden.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const res = await fetch("/api/auth/recuperar-contrasena/restablecer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correo: cleanEmail,
          codigo: cleanCodigo,
          nueva_contrasena: nuevaContrasena,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.message || "No se pudo restablecer la contraseña.");
      } else {
        setStep("exito");
      }
    } catch {
      setErrorMessage("Error al conectar con el servidor. Inténtalo más tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md" style={{ padding: "2.5rem" }}>
      {/* HEADER ICON */}
      <Flex direction="column" gap="4" align="center" style={{ textAlign: "center" }}>
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background:
              step === "exito"
                ? "rgba(34, 197, 94, 0.15)"
                : "rgba(13, 148, 136, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: step === "exito" ? "#22c55e" : "#0d9488",
          }}
        >
          {step === "exito" ? (
            <CheckCircledIcon width={36} height={36} />
          ) : step === "restablecer" ? (
            <KeyRound size={32} />
          ) : (
            <Mail size={32} />
          )}
        </div>

        {/* TÍTULO Y DESCRIPCIÓN */}
        <Box>
          <Text size="5" weight="bold" style={{ color: "white" }} as="div">
            {step === "solicitar" && "Recuperar Contraseña"}
            {step === "restablecer" && "Restablecer Contraseña"}
            {step === "exito" && "¡Contraseña Actualizada!"}
          </Text>
          <Text size="2" color="gray" mt="1" as="div">
            {step === "solicitar" &&
              "Ingresa tu correo registrado y te enviaremos un código de 6 dígitos para restablecer tu contraseña."}
            {step === "restablecer" &&
              `Ingresa el código enviado a tu correo y tu nueva contraseña.`}
            {step === "exito" &&
              "Tu contraseña ha sido restablecida exitosamente. Ya puedes ingresar al sistema con tu nueva contraseña."}
          </Text>
          {step === "restablecer" && correo && (
            <Text
              size="2"
              weight="bold"
              style={{ color: "#38bdf8", wordBreak: "break-all" }}
              mt="1"
              as="div"
            >
              {correo}
            </Text>
          )}
        </Box>

        {/* MENSAJES DE NOTIFICACIÓN */}
        {infoMessage && step !== "exito" && (
          <Callout.Root color="blue" style={{ width: "100%", textAlign: "left" }}>
            <Callout.Icon>
              <CheckCircledIcon />
            </Callout.Icon>
            <Callout.Text size="2">{infoMessage}</Callout.Text>
          </Callout.Root>
        )}

        {errorMessage && (
          <Callout.Root color="red" style={{ width: "100%", textAlign: "left" }}>
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text size="2">{errorMessage}</Callout.Text>
          </Callout.Root>
        )}

        {/* PASO 1: SOLICITAR CÓDIGO */}
        {step === "solicitar" && (
          <form
            onSubmit={handleSolicitarCodigo}
            style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <Box style={{ textAlign: "left" }}>
              <label style={{ display: "block", marginBottom: "0.35rem" }}>
                <Text size="2" weight="medium" style={{ color: "white" }}>
                  Correo electrónico
                </Text>
              </label>
              <TextField.Root
                type="email"
                placeholder="ejemplo@correo.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                autoFocus
                required
                style={{ width: "100%" }}
              />
            </Box>

            <Button
              type="submit"
              disabled={isLoading || !correo.trim()}
              size="3"
              style={{ width: "100%", cursor: "pointer" }}
            >
              {isLoading ? (
                <Flex align="center" gap="2">
                  <Loader2 size={18} className="animate-spin" />
                  <span>Enviando código...</span>
                </Flex>
              ) : (
                "Enviar código de recuperación"
              )}
            </Button>

            <Box style={{ textAlign: "center", marginTop: "0.5rem" }}>
              <Link
                href="/auth/login"
                style={{
                  color: "var(--accent-9)",
                  fontSize: "0.875rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  textDecoration: "none",
                }}
              >
                <ArrowLeft size={16} />
                Volver al inicio de sesión
              </Link>
            </Box>
          </form>
        )}

        {/* PASO 2: RESTABLECER CONTRASEÑA */}
        {step === "restablecer" && (
          <form
            onSubmit={handleRestablecerContrasena}
            style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1.1rem" }}
          >
            {/* CÓDIGO DE 6 DÍGITOS */}
            <Box style={{ textAlign: "left" }}>
              <label style={{ display: "block", marginBottom: "0.35rem" }}>
                <Text size="2" weight="medium" style={{ color: "white" }}>
                  Código de confirmación (6 dígitos)
                </Text>
              </label>
              <TextField.Root
                ref={codigoInputRef}
                placeholder="123456"
                maxLength={6}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                style={{
                  width: "100%",
                  fontSize: "1.4rem",
                  letterSpacing: "0.35rem",
                  textAlign: "center",
                  fontWeight: "bold",
                }}
              />
            </Box>

            {/* NUEVA CONTRASEÑA */}
            <Box style={{ textAlign: "left" }}>
              <label style={{ display: "block", marginBottom: "0.35rem" }}>
                <Text size="2" weight="medium" style={{ color: "white" }}>
                  Nueva contraseña
                </Text>
              </label>
              <TextField.Root
                type="password"
                placeholder="Mínimo 10 caracteres"
                value={nuevaContrasena}
                onChange={(e) => setNuevaContrasena(e.target.value)}
                style={{ width: "100%" }}
              />

              {/* REGLAS DE CONTRASEÑA */}
              <Box
                mt="2"
                p="2"
                style={{
                  background: "rgba(15, 23, 42, 0.6)",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                }}
              >
                <Text size="1" color="gray" weight="medium" as="div" mb="1">
                  Requisitos de la contraseña:
                </Text>
                <Flex direction="column" gap="1">
                  <Flex align="center" gap="1">
                    <span style={{ color: tieneLongitud ? "#22c55e" : "#94a3b8" }}>
                      {tieneLongitud ? "✓" : "•"}
                    </span>
                    <Text size="1" color={tieneLongitud ? "green" : "gray"}>
                      Al menos 10 caracteres
                    </Text>
                  </Flex>
                  <Flex align="center" gap="1">
                    <span style={{ color: tieneMayus && tieneMinus ? "#22c55e" : "#94a3b8" }}>
                      {tieneMayus && tieneMinus ? "✓" : "•"}
                    </span>
                    <Text size="1" color={tieneMayus && tieneMinus ? "green" : "gray"}>
                      Mayúsculas y minúsculas
                    </Text>
                  </Flex>
                  <Flex align="center" gap="1">
                    <span style={{ color: tieneNumero ? "#22c55e" : "#94a3b8" }}>
                      {tieneNumero ? "✓" : "•"}
                    </span>
                    <Text size="1" color={tieneNumero ? "green" : "gray"}>
                      Al menos un número
                    </Text>
                  </Flex>
                </Flex>
              </Box>
            </Box>

            {/* CONFIRMAR CONTRASEÑA */}
            <Box style={{ textAlign: "left" }}>
              <label style={{ display: "block", marginBottom: "0.35rem" }}>
                <Text size="2" weight="medium" style={{ color: "white" }}>
                  Confirmar nueva contraseña
                </Text>
              </label>
              <TextField.Root
                type="password"
                placeholder="Repite la nueva contraseña"
                value={confirmarContrasena}
                onChange={(e) => setConfirmarContrasena(e.target.value)}
                style={{ width: "100%" }}
              />
              {confirmarContrasena && !coincidenContrasenas && (
                <Text size="1" color="red" mt="1">
                  Las contraseñas no coinciden
                </Text>
              )}
            </Box>

            <Button
              type="submit"
              disabled={
                isLoading ||
                codigo.trim().length !== 6 ||
                !contrasenaValida ||
                !coincidenContrasenas
              }
              size="3"
              style={{ width: "100%", cursor: "pointer" }}
            >
              {isLoading ? (
                <Flex align="center" gap="2">
                  <Loader2 size={18} className="animate-spin" />
                  <span>Actualizando contraseña...</span>
                </Flex>
              ) : (
                "Restablecer contraseña"
              )}
            </Button>

            {/* REENVIAR CÓDIGO Y ACCIONES SECUNDARIAS */}
            <Flex direction="column" gap="2" align="center" mt="1">
              <Button
                type="button"
                variant="ghost"
                size="2"
                disabled={resendCooldown > 0 || isResending}
                onClick={handleReenviarCodigo}
                style={{ cursor: resendCooldown > 0 ? "not-allowed" : "pointer" }}
              >
                {isResending ? (
                  <Flex align="center" gap="2">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Reenviando...</span>
                  </Flex>
                ) : resendCooldown > 0 ? (
                  <Flex align="center" gap="2" style={{ color: "#94a3b8" }}>
                    <ReloadIcon className="animate-spin" />
                    <span>Reenviar código en {resendCooldown}s</span>
                  </Flex>
                ) : (
                  <Flex align="center" gap="2">
                    <ReloadIcon />
                    <span>¿No te llegó el código? Reenviar</span>
                  </Flex>
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setStep("solicitar");
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Cambiar correo electrónico
              </button>
            </Flex>
          </form>
        )}

        {/* PASO 3: ÉXITO */}
        {step === "exito" && (
          <Flex direction="column" gap="4" style={{ width: "100%" }}>
            <Callout.Root color="green" style={{ width: "100%", textAlign: "left" }}>
              <Callout.Icon>
                <CheckCircledIcon />
              </Callout.Icon>
              <Callout.Text size="2">
                Tu clave ha sido cambiada de forma segura. Todas las sesiones activas han sido cerradas.
              </Callout.Text>
            </Callout.Root>

            <Button
              size="3"
              style={{ width: "100%", cursor: "pointer" }}
              onClick={() => {
                window.location.href = "/auth/login";
              }}
            >
              Iniciar sesión ahora
            </Button>
          </Flex>
        )}
      </Flex>
    </Card>
  );
}
