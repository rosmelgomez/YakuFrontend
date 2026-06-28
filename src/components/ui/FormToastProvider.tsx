"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type React from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type ToastTone = "success" | "error" | "warning" | "info";

type Toast = {
  id: number;
  title: string;
  message: string;
  tone: ToastTone;
};

const toneStyles: Record<ToastTone, { icon: React.ReactNode; title: string; border: string; bg: string }> = {
  success: {
    icon: <CheckCircle2 size={20} />,
    title: "Listo",
    border: "rgba(34, 197, 94, 0.45)",
    bg: "linear-gradient(135deg, rgba(34, 197, 94, 0.16), rgba(45, 212, 191, 0.08))",
  },
  error: {
    icon: <AlertCircle size={20} />,
    title: "No se pudo completar",
    border: "rgba(239, 68, 68, 0.5)",
    bg: "linear-gradient(135deg, rgba(239, 68, 68, 0.16), rgba(245, 158, 11, 0.07))",
  },
  warning: {
    icon: <AlertCircle size={20} />,
    title: "Revisa los datos",
    border: "rgba(245, 158, 11, 0.5)",
    bg: "linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(56, 189, 248, 0.06))",
  },
  info: {
    icon: <Info size={20} />,
    title: "Aviso",
    border: "rgba(56, 189, 248, 0.45)",
    bg: "linear-gradient(135deg, rgba(56, 189, 248, 0.14), rgba(167, 139, 250, 0.08))",
  },
};

function classifyAlert(message: string): ToastTone {
  const text = message.toLowerCase();
  if (text.includes("error") || text.includes("no se pudo") || text.includes("fall")) return "error";
  if (text.includes("complete") || text.includes("seleccione") || text.includes("obligator") || text.includes("válido") || text.includes("valido")) return "warning";
  if (text.includes("éxito") || text.includes("exito") || text.includes("correctamente") || text.includes("registrad") || text.includes("guardad")) return "success";
  return "info";
}

function cleanAlertText(message: string) {
  return message.replace(/^[✅❌⚠️\s]+/u, "").trim();
}

export default function FormToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalContainer(document.body);

    const originalAlert = window.alert;

    window.alert = (value?: unknown) => {
      const rawMessage = String(value ?? "");
      const tone = classifyAlert(rawMessage);
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [
        ...current.slice(-3),
        {
          id,
          tone,
          title: toneStyles[tone].title,
          message: cleanAlertText(rawMessage),
        },
      ]);

      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, tone === "error" ? 6500 : 4600);
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  const visibleToasts = useMemo(() => toasts.slice(-4), [toasts]);
  if (!portalContainer) return null;

  return createPortal(
    <div className="pointer-events-none fixed right-4 top-4 z-[2147483647] flex w-[min(420px,calc(100vw-32px))] flex-col gap-3">
      {visibleToasts.map((toast) => {
        const styles = toneStyles[toast.tone];

        return (
          <div
            key={toast.id}
            className="pointer-events-auto overflow-hidden rounded-lg border shadow-2xl backdrop-blur-xl"
            style={{
              background: styles.bg,
              borderColor: styles.border,
              boxShadow: "0 18px 45px rgba(0, 0, 0, 0.28)",
            }}
            role="status"
          >
            <div className="flex items-start gap-3 bg-[#0c1014]/88 p-4">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.06]" style={{ color: styles.border }}>
                {styles.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{toast.title}</p>
                <p className="mt-1 text-sm leading-5 text-[#b9c9d6]">{toast.message}</p>
              </div>
              <button
                type="button"
                aria-label="Cerrar alerta"
                className="rounded-md p-1 text-[#7f93a3] transition hover:bg-white/10 hover:text-white"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setToasts((current) => current.filter((item) => item.id !== toast.id));
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>,
    portalContainer
  );
}
