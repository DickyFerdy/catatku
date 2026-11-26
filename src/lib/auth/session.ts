import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "catatku_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

interface SessionPayload {
  sub: string;
  exp: number;
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET belum diatur atau terlalu pendek (minimal 16 karakter)."
    );
  }
  return secret;
}

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  return new Uint8Array(Buffer.from(padded + "=".repeat(padLength), "base64"));
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Membuat token sesi bertanda tangan HMAC-SHA256.
 */
export async function createSessionToken(
  userId: string,
  ttlSeconds = SESSION_TTL_SECONDS
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload: SessionPayload = { sub: userId, exp };
  const encodedPayload = toBase64Url(
    new TextEncoder().encode(JSON.stringify(payload))
  );

  const key = await importHmacKey(getSessionSecret());
  const signature = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encodedPayload)
  );

  return `${encodedPayload}.${toBase64Url(new Uint8Array(signature))}`;
}

/**
 * Memverifikasi token sesi dan mengembalikan userId jika valid dan belum kadaluarsa.
 */
export async function verifySessionToken(
  token: string
): Promise<{ userId: string } | null> {
  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, encodedSig] = parts;
  if (!encodedPayload || !encodedSig) {
    return null;
  }

  try {
    const key = await importHmacKey(getSessionSecret());
    const sigBytes = fromBase64Url(encodedSig);
    const sigBuffer = new Uint8Array(sigBytes).buffer;
    const isValid = await globalThis.crypto.subtle.verify(
      "HMAC",
      key,
      sigBuffer,
      new TextEncoder().encode(encodedPayload)
    );
    if (!isValid) {
      return null;
    }

    const decoded = new TextDecoder().decode(fromBase64Url(encodedPayload));
    const parsed = JSON.parse(decoded) as Partial<SessionPayload>;
    if (
      typeof parsed.sub !== "string" ||
      !parsed.sub ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }

    if (parsed.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return { userId: parsed.sub };
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionUserIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  const session = await verifySessionToken(token);
  return session?.userId ?? null;
}
