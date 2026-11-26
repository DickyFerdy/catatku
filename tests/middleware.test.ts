import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/token";
import { middleware } from "@/middleware";

describe("auth middleware", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test-session-secret-min-16-chars";
  });

  function makeRequest(path: string, token?: string): NextRequest {
    const headers = token
      ? { cookie: `${SESSION_COOKIE_NAME}=${token}` }
      : undefined;
    return new NextRequest(`http://localhost:3000${path}`, { headers });
  }

  it("redirects unauthenticated page requests to /login", async () => {
    const res = await middleware(makeRequest("/"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("returns 401 for unauthenticated protected API requests", async () => {
    const res = await middleware(makeRequest("/api/transactions"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("allows public pages and public API routes without a session", async () => {
    for (const path of [
      "/login",
      "/register",
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/logout",
      "/api/health",
    ]) {
      const res = await middleware(makeRequest(path));
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    }
  });

  it("allows authenticated requests and redirects logged-in users away from /login", async () => {
    const token = await createSessionToken("user-1");

    const homeRes = await middleware(makeRequest("/", token));
    expect(homeRes.status).toBe(200);

    const apiRes = await middleware(makeRequest("/api/transactions", token));
    expect(apiRes.status).toBe(200);

    const loginRes = await middleware(makeRequest("/login", token));
    expect(loginRes.status).toBe(307);
    expect(loginRes.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("rejects tampered session cookies", async () => {
    const res = await middleware(makeRequest("/api/transactions", "bad.token"));
    expect(res.status).toBe(401);
  });
});
