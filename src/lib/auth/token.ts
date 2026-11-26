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
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + "=".repeat(padLength));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
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
 * Membuat token sesi bertanda tangan HMAC-SHA256 (kompatibel Node & Edge).
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
