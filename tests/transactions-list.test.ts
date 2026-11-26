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
import { createTransaction } from "@/lib/queries/transactions";
import { GET as listTransactionsGet } from "@/app/api/transactions/route";

describe("GET /api/transactions (list & filters)", () => {
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

  it("filters by Asia/Jakarta date range, category, and account, and isolates users", async () => {
    const accsA = await listAccounts(db, userAId);
    const catsA = await listCategories(db, userAId);
    const acc1 = accsA[0]!;
    const acc2 = accsA[1]!;
    const cat1 = catsA[0]!;
    const cat2 = catsA[1]!;

    // 2026-11-27 00:30 WIB = 2026-11-26 17:30 UTC (still Nov 27 in Jakarta!)
    await createTransaction(db, userAId, {
      amount: 25000,
      type: "expense",
      occurredAt: "2026-11-27T00:30",
      merchant: "Subuh Mart",
      categoryId: cat1.id,
      accountId: acc1.id,
      source: "manual",
    });

    await createTransaction(db, userAId, {
      amount: 50000,
      type: "expense",
      occurredAt: "2026-11-28T10:00",
      merchant: "Siang Cafe",
      categoryId: cat2.id,
      accountId: acc2.id,
      source: "manual",
    });

    // User B transaction should never appear
    await createTransaction(db, userBId, {
      amount: 999000,
      type: "expense",
      occurredAt: "2026-11-27T12:00",
      merchant: "User B Store",
      source: "manual",
    });

    const dateRes = await listTransactionsGet(
      new Request(
        "http://localhost/api/transactions?from=2026-11-27&to=2026-11-27"
      )
    );
    expect(dateRes.status).toBe(200);
    const dateData = (await dateRes.json()) as {
      transactions: Array<{ merchant: string | null }>;
    };
    expect(dateData.transactions.map((t) => t.merchant)).toEqual([
      "Subuh Mart",
    ]);

    const catRes = await listTransactionsGet(
      new Request(`http://localhost/api/transactions?categoryId=${cat2.id}`)
    );
    const catData = (await catRes.json()) as {
      transactions: Array<{ merchant: string | null }>;
    };
    expect(catData.transactions.map((t) => t.merchant)).toEqual([
      "Siang Cafe",
    ]);

    const accRes = await listTransactionsGet(
      new Request(`http://localhost/api/transactions?accountId=${acc1.id}`)
    );
    const accData = (await accRes.json()) as {
      transactions: Array<{ merchant: string | null }>;
    };
    expect(accData.transactions.map((t) => t.merchant)).toEqual([
      "Subuh Mart",
    ]);
  });
});
