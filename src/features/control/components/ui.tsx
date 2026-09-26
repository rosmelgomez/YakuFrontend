"use client";

import React from "react";
import { Box, Card, Flex, Text } from "@radix-ui/themes";
import { ChevronDown, Info, type LucideIcon } from "lucide-react";

// Primitivas visuales compartidas por las pestañas de Control. Usan los tokens
// de index.css (--green, --blue, --amber...) para que el acento de esta pantalla
// coincida con el resto del dashboard (acento verde, iconos lucide).

export type Tone = "green" | "blue" | "amber" | "red" | "purple" | "teal" | "gray";

const TONES: Record<Tone, { fg: string; bg: string; brd: string }> = {
  green: { fg: "var(--green)", bg: "var(--greenbg)", brd: "var(--greenbrd)" },
  blue: { fg: "var(--blue)", bg: "var(--bluebg)", brd: "var(--bluebrd)" },
  amber: { fg: "var(--amber)", bg: "var(--amberbg)", brd: "var(--amberbrd)" },
  red: { fg: "var(--red)", bg: "var(--redbg)", brd: "var(--redbrd)" },
  purple: { fg: "var(--purple)", bg: "var(--purplebg)", brd: "var(--purplebrd)" },
  teal: { fg: "var(--teal)", bg: "var(--tealbg)", brd: "var(--tealbrd)" },
  gray: { fg: "var(--muted-foreground)", bg: "rgba(255, 255, 255, 0.04)", brd: "var(--border2-mockup)" },
};

export function tone(t: Tone) {
  return TONES[t];
}

export function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <Card
      size={{ initial: "2", sm: "3" }}
      style={{
        background: "var(--surface-mockup)",
        borderColor: "var(--border-mockup)",
        borderRadius: "14px",
        ...style,
      }}
    >
      {children}
    </Card>
  );
}

// Superficie interna (un nivel por debajo de Panel). Nunca otro Card anidado.
export function Inset({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background: "var(--surface2-mockup)",
        border: "1px solid var(--border-mockup)",
        borderRadius: "10px",
        padding: "14px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function IconTile({ icon: Icon, t = "green", size = 32 }: { icon: LucideIcon; t?: Tone; size?: number }) {
  const c = TONES[t];
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: c.bg,
        border: `1px solid ${c.brd}`,
        color: c.fg,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={2} />
    </span>
  );
}

export function SectionHeader({
  icon,
  t = "green",
  title,
  description,
  aside,
}: {
  icon: LucideIcon;
  t?: Tone;
  title: React.ReactNode;
  description?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <Flex justify="between" align="start" gap="3" wrap="wrap">
      <Flex gap="3" align="start" style={{ minWidth: 0, flex: "1 1 260px" }}>
        <IconTile icon={icon} t={t} />
        <Box style={{ minWidth: 0 }}>
          <Text as="div" size="3" weight="bold" style={{ color: "var(--foreground)", lineHeight: 1.3 }}>
            {title}
          </Text>
          {description && (
            <Text as="div" size="2" style={{ color: "var(--muted-foreground)", marginTop: 2 }}>
              {description}
            </Text>
          )}
        </Box>
      </Flex>
      {aside && <Box style={{ flexShrink: 0 }}>{aside}</Box>}
    </Flex>
  );
}

export function StatusDot({ t, pulse = false }: { t: Tone; pulse?: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: TONES[t].fg,
        flexShrink: 0,
        animation: pulse ? "pulse 1.5s infinite" : undefined,
      }}
    />
  );
}

// Nota de ayuda plegable: conserva el texto explicativo sin que domine la pantalla.
export function HelpNote({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <details className="control-help group">
      <summary>
        <Info size={16} strokeWidth={2} aria-hidden style={{ color: "var(--blue)", flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{title}</span>
        <ChevronDown size={16} aria-hidden className="control-help-chevron" />
      </summary>
      <div className="control-help-body">{children}</div>
    </details>
  );
}

export const controlStyles = `
  .control-help {
    background: var(--bluebg);
    border: 1px solid var(--bluebrd);
    border-radius: 10px;
  }
  .control-help > summary {
    list-style: none;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
    color: #bae6fd;
    border-radius: 10px;
  }
  .control-help > summary::-webkit-details-marker { display: none; }
  .control-help > summary:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
  .control-help-chevron { color: var(--muted-foreground); transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1); }
  .control-help[open] .control-help-chevron { transform: rotate(180deg); }
  .control-help-body {
    padding: 0 14px 12px 40px;
    font-size: 0.8125rem;
    line-height: 1.55;
    color: #a5bccd;
  }
  .control-help-body p { margin: 0 0 6px; max-width: 70ch; }
  .control-help-body strong { color: var(--foreground); }
  .control-tabs [role="tab"] { cursor: pointer; flex: 1; gap: 8px; }
  .control-tabs [role="tab"] svg { flex-shrink: 0; }
  .control-num { font-variant-numeric: tabular-nums; }
  .threshold-input::-webkit-outer-spin-button,
  .threshold-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .threshold-input { -moz-appearance: textfield; }
`;
