import { resolve } from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as dbModule from "@/db";
import * as sessionModule from "@/lib/auth/session";
import { registerUser } from "@/lib/auth/service";
import {
  listAccounts,
  listCategories,
} from "@/lib/queries/accounts-categories";
import { POST as createTransactionPost } from "@/app/api/transactions/route";

describe("POST /api/transactions (manual creation)", () => {
  const cleanups: Array<() => void> = [];
  let db: dbModule.AppDatabase;
  let userAId: string;
  let userBId: string;

  beforeEach(async () => {
    const conn = dbModule.createDb(":memory:");
    migrate(conn.db, {
      migrationsFolder: resolve(process.cwd(), "src/db/migrations"),
    });
    cleanups.push(() => conn.sqlite.close());
    db = conn.db;
    vi.spyOn(dbModule, "getDb").mockReturnValue(db);

    const regA = await registerUser(db, {
      email: "a@example.com",
      password: "password123",
    });
    const regB = await registerUser(db, {
      email: "b@example.com",
      password: "password123",
    });
    if (!regA.ok || !regB.ok) {
      throw new Error("Failed to seed test users");
    }
    userAId = regA.user.id;
    userBId = regB.user.id;
    vi.spyOn(sessionModule, "getSessionUserIdFromCookies").mockResolvedValue(
      userAId
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    while (cleanups.length > 0) {
      cleanups.pop()?.();
    }
  });

  function postReq(body: unknown): Request {
    return new Request("http://localhost/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("creates a manual transaction with integer rupiah and converts Jakarta time to UTC", async () => {
    const [account] = await listAccounts(db, userAId);
    const [category] = await listCategories(db, userAId);

    const res = await createTransactionPost(
      postReq({
        amount: 35000,
        type: "expense",
        occurredAt: "2026-11-27T12:30",
        merchant: "Warteg",
        note: "makan siang",
        accountId: account?.id,
        categoryId: category?.id,
      })
    );

    expect(res.status).toBe(201);
    const data = (await res.json()) as {
      transaction: {
        amount: number;
        occurredAt: string;
        source: string;
      };
    };
    expect(data.transaction.amount).toBe(35000);
    expect(data.transaction.occurredAt).toBe("2026-11-27T05:30:00.000Z");
    expect(data.transaction.source).toBe("manual");
  });

  it("rejects float, zero, or negative amounts", async () => {
    for (const badAmount of [35000.5, 0, -1000]) {
      const res = await createTransactionPost(
        postReq({
          amount: badAmount,
          type: "expense",
          occurredAt: "2026-11-27T12:30",
        })
      );
      expect(res.status).toBe(400);
    }
  });

  it("rejects accountId or categoryId owned by another user", async () => {
    const [otherAccount] = await listAccounts(db, userBId);
    const [otherCategory] = await listCategories(db, userBId);

    const badAcc = await createTransactionPost(
      postReq({
        amount: 10000,
        type: "expense",
        occurredAt: "2026-11-27T12:30",
        accountId: otherAccount?.id,
      })
    );
    expect(badAcc.status).toBe(400);

    const badCat = await createTransactionPost(
      postReq({
        amount: 10000,
        type: "expense",
        occurredAt: "2026-11-27T12:30",
        categoryId: otherCategory?.id,
      })
    );
    expect(badCat.status).toBe(400);
  });
});
