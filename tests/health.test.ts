import { afterEach, describe, expect, it, vi } from "vitest";
import * as dbModule from "@/db";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 200 with ok status when database is reachable", async () => {
    vi.spyOn(dbModule, "getDb").mockReturnValue({
      get: vi.fn().mockReturnValue({ "1": 1 }),
    } as unknown as ReturnType<typeof dbModule.getDb>);

    const res = await GET();
    const body = (await res.json()) as {
      status: string;
      db: string;
      timestamp: string;
    };

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.db).toBe("ok");
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });

  it("returns 503 with error status when database check fails", async () => {
    vi.spyOn(dbModule, "getDb").mockReturnValue({
      get: vi.fn().mockImplementation(() => {
        throw new Error("db unavailable");
      }),
    } as unknown as ReturnType<typeof dbModule.getDb>);

    const res = await GET();
    const body = (await res.json()) as {
      status: string;
      db: string;
      timestamp: string;
    };

    expect(res.status).toBe(503);
    expect(body.status).toBe("error");
    expect(body.db).toBe("error");
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });
});
