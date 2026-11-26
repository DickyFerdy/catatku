import { resolve } from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as dbModule from "@/db";
import { POST as loginPost } from "@/app/api/auth/login/route";
import { POST as logoutPost } from "@/app/api/auth/logout/route";
import { POST as registerPost } from "@/app/api/auth/register/route";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth/session";

describe("auth password & session helpers", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test-session-secret-min-16-chars";
  });

  it("hashes and verifies passwords correctly", async () => {
    const hash = await hashPassword("rahasia123");
    expect(hash).not.toBe("rahasia123");
    expect(await verifyPassword("rahasia123", hash)).toBe(true);
    expect(await verifyPassword("salah1234", hash)).toBe(false);
  });

  it("creates, verifies, and rejects tampered or expired session tokens", async () => {
    const token = await createSessionToken("user-123");
    const verified = await verifySessionToken(token);
    expect(verified).toEqual({ userId: "user-123" });

    const [payload, sig] = token.split(".");
    const replacement = sig?.endsWith("x") ? "y" : "x";
    const tampered = `${payload}.${sig?.slice(0, -1)}${replacement}`;
    expect(await verifySessionToken(tampered)).toBeNull();

    const expired = await createSessionToken("user-123", -10);
    expect(await verifySessionToken(expired)).toBeNull();
  });
});

describe("auth API routes (/api/auth/*)", () => {
  const cleanups: Array<() => void> = [];

  beforeEach(() => {
    process.env.SESSION_SECRET = "test-session-secret-min-16-chars";
    const { db, sqlite } = dbModule.createDb(":memory:");
    migrate(db, {
      migrationsFolder: resolve(process.cwd(), "src/db/migrations"),
    });
    cleanups.push(() => sqlite.close());
    vi.spyOn(dbModule, "getDb").mockReturnValue(db);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    while (cleanups.length > 0) {
      cleanups.pop()?.();
    }
  });

  function jsonRequest(body: unknown): Request {
    return new Request("http://localhost/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("registers a new user, sets httpOnly session cookie, and rejects duplicates", async () => {
    const res1 = await registerPost(
      jsonRequest({ email: "User@Example.com", password: "password123" })
    );
    const body1 = (await res1.json()) as { user: { id: string; email: string } };

    expect(res1.status).toBe(201);
    expect(body1.user.email).toBe("user@example.com");
    expect(body1.user.id).toBeTruthy();

    const setCookie = res1.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(setCookie.toLowerCase()).toContain("httponly");

    const resDup = await registerPost(
      jsonRequest({ email: "user@example.com", password: "password123" })
    );
    expect(resDup.status).toBe(409);
  });

  it("logs in with valid credentials and rejects invalid credentials", async () => {
    await registerPost(
      jsonRequest({ email: "dicky@example.com", password: "password123" })
    );

    const okRes = await loginPost(
      jsonRequest({ email: "dicky@example.com", password: "password123" })
    );
    expect(okRes.status).toBe(200);
    expect(okRes.headers.get("set-cookie")).toContain(`${SESSION_COOKIE_NAME}=`);

    const badPass = await loginPost(
      jsonRequest({ email: "dicky@example.com", password: "wrongpassword" })
    );
    expect(badPass.status).toBe(401);

    const badEmail = await loginPost(
      jsonRequest({ email: "nobody@example.com", password: "password123" })
    );
    expect(badEmail.status).toBe(401);
  });

  it("clears session cookie on logout", async () => {
    const res = await logoutPost();
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(setCookie).toContain("Max-Age=0");
  });
});
