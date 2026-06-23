import type { NextConfig } from "next";

const parseOrigins = (...values: Array<string | undefined>) =>
  Array.from(new Set(
    values
      .flatMap((value) => value?.split(",") ?? [])
      .map((origin) => origin.trim())
      .filter(Boolean)
      .map((origin) => {
        try {
          return new URL(origin.includes("://") ? origin : `https://${origin}`).host;
        } catch {
          return origin;
        }
      }),
  ));

const allowedDevOrigins = parseOrigins(process.env.ALLOWED_DEV_ORIGINS);

const isDevelopment = process.env.NODE_ENV === "development";
const serverActionAllowedOrigins = parseOrigins(
  process.env.SERVER_ACTION_ALLOWED_ORIGINS,
  process.env.NEXTAUTH_URL,
  isDevelopment ? process.env.ALLOWED_DEV_ORIGINS : undefined,
);
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "connect-src 'self' https: wss: ws:",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins,
  experimental: {
    serverActions: {
      allowedOrigins: serverActionAllowedOrigins,
    },
  },
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Content-Security-Policy", value: contentSecurityPolicy },
    ];
    if (!isDevelopment) {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      });
    }
    return [{
      source: "/(.*)",
      headers: securityHeaders,
    }];
  },
};

export default nextConfig;
