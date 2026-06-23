import "server-only";

import { createHmac, randomUUID } from "node:crypto";


function encode(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function getSecret() {
  const secret = process.env.BFF_JWT_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("BFF_JWT_SECRET debe tener al menos 32 caracteres");
  }
  return secret;
}

export function createBffToken(userId: string, audience = "yaku-api", ttlSeconds = 60) {
  if (!/^\d+$/.test(userId)) {
    throw new Error("Identificador de usuario invalido");
  }
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({
    sub: userId,
    aud: audience,
    type: "bff",
    iat: now,
    exp: now + Math.min(ttlSeconds, 90),
    jti: randomUUID(),
  });
  const signingInput = `${header}.${payload}`;
  const signature = createHmac("sha256", getSecret()).update(signingInput).digest("base64url");
  return `${signingInput}.${signature}`;
}
