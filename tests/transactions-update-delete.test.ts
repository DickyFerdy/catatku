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
import { createTransaction, listTransactions } from "@/lib/queries/transactions";
import {
  DELETE as deleteTransactionRoute,
  PATCH as patchTransactionRoute,
} from "@/app/api/transactions/[id]/route";

describe("PATCH & DELETE /api/transactions/[id]", () => {
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
    while (cleanups.length > 0) {
      cleanups.pop()?.();
    }
  });

  function mockUser(userId: string) {
    vi.spyOn(sessionModule, "getSessionUserIdFromCookies").mockResolvedValue(
      userId
    );
  }

  it("updates and deletes own transaction, and isolates from other users", async () => {
    const [accA] = await listAccounts(db, userAId);
    const [catA] = await listCategories(db, userAId);
    const [catB] = await listCategories(db, userBId);

    const created = await createTransaction(db, userAId, {
      amount: 35000,
      type: "expense",
      occurredAt: "2026-11-27T12:00",
      merchant: "Warteg",
      accountId: accA?.id,
      categoryId: catA?.id,
      source: "manual",
    });
    if (!created.ok) throw new Error("Failed to create tx");
    const txId = created.transaction.id;

    // User B cannot update or delete User A's transaction
    mockUser(userBId);
    const forbiddenPatch = await patchTransactionRoute(
      new Request(`http://localhost/api/transactions/${txId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 1000,
          type: "expense",
          occurredAt: "2026-11-27T12:00",
        }),
      }),
      { params: Promise.resolve({ id: txId }) }
    );
    expect(forbiddenPatch.status).toBe(404);

    const forbiddenDelete = await deleteTransactionRoute(
      new Request(`http://localhost/api/transactions/${txId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: txId }) }
    );
    expect(forbiddenDelete.status).toBe(404);

    // User A cannot assign User B's category
    mockUser(userAId);
    const badCatPatch = await patchTransactionRoute(
      new Request(`http://localhost/api/transactions/${txId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 42000,
          type: "expense",
          occurredAt: "2026-11-27T13:00",
          categoryId: catB?.id,
        }),
      }),
      { params: Promise.resolve({ id: txId }) }
    );
    expect(badCatPatch.status).toBe(400);

    // User A can update and delete their own transaction
    const okPatch = await patchTransactionRoute(
      new Request(`http://localhost/api/transactions/${txId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 42000,
          type: "expense",
          occurredAt: "2026-11-27T13:00",
          merchant: "Warteg Bahari",
          categoryId: catA?.id,
          accountId: accA?.id,
        }),
      }),
      { params: Promise.resolve({ id: txId }) }
    );
    expect(okPatch.status).toBe(200);
    const patched = (await okPatch.json()) as {
      transaction: { amount: number; merchant: string | null };
    };
    expect(patched.transaction.amount).toBe(42000);
    expect(patched.transaction.merchant).toBe("Warteg Bahari");

    const okDelete = await deleteTransactionRoute(
      new Request(`http://localhost/api/transactions/${txId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: txId }) }
    );
    expect(okDelete.status).toBe(200);
    expect(await listTransactions(db, userAId)).toHaveLength(0);
  });
});
