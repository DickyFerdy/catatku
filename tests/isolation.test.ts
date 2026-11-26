import { resolve } from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as dbModule from "@/db";
import * as sessionModule from "@/lib/auth/session";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/token";
import { POST as registerPost } from "@/app/api/auth/register/route";
import {
  GET as getAccounts,
  POST as postAccount,
} from "@/app/api/accounts/route";
import {
  DELETE as deleteAccountRoute,
  PATCH as patchAccountRoute,
} from "@/app/api/accounts/[id]/route";
import {
  GET as getCategories,
  POST as postCategory,
} from "@/app/api/categories/route";
import {
  DELETE as deleteCategoryRoute,
  PATCH as patchCategoryRoute,
} from "@/app/api/categories/[id]/route";
import {
  GET as getTransactions,
  POST as postTransaction,
} from "@/app/api/transactions/route";
import {
  DELETE as deleteTransactionRoute,
  PATCH as patchTransactionRoute,
} from "@/app/api/transactions/[id]/route";

function extractCookieToken(setCookieHeader: string | null): string {
  const match = setCookieHeader?.match(
    new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`)
  );
  if (!match?.[1]) {
    throw new Error("Session cookie not found in response");
  }
  return match[1];
}

describe("end-to-end user data isolation", () => {
  const cleanups: Array<() => void> = [];
  let tokenA: string;
  let tokenB: string;

  beforeEach(async () => {
    process.env.SESSION_SECRET = "test-session-secret-min-16-chars";
    const conn = dbModule.createDb(":memory:");
    migrate(conn.db, {
      migrationsFolder: resolve(process.cwd(), "src/db/migrations"),
    });
    cleanups.push(() => conn.sqlite.close());
    vi.spyOn(dbModule, "getDb").mockReturnValue(conn.db);

    const resA = await registerPost(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "alice@example.com",
          password: "password123",
        }),
      })
    );
    const resB = await registerPost(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "bob@example.com",
          password: "password123",
        }),
      })
    );
    tokenA = extractCookieToken(resA.headers.get("set-cookie"));
    tokenB = extractCookieToken(resB.headers.get("set-cookie"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    while (cleanups.length > 0) {
      cleanups.pop()?.();
    }
  });

  async function actAs(token: string | null) {
    if (!token) {
      vi.spyOn(sessionModule, "getSessionUserIdFromCookies").mockResolvedValue(
        null
      );
      return;
    }
    const verified = await verifySessionToken(token);
    vi.spyOn(sessionModule, "getSessionUserIdFromCookies").mockResolvedValue(
      verified?.userId ?? null
    );
  }

  it("rejects unauthenticated requests with 401 across all data endpoints", async () => {
    await actAs(null);

    expect((await getAccounts()).status).toBe(401);
    expect(
      (
        await patchAccountRoute(
          new Request("http://localhost/api/accounts/1", { method: "PATCH" }),
          { params: Promise.resolve({ id: "1" }) }
        )
      ).status
    ).toBe(401);
    expect(
      (
        await deleteAccountRoute(
          new Request("http://localhost/api/accounts/1", { method: "DELETE" }),
          { params: Promise.resolve({ id: "1" }) }
        )
      ).status
    ).toBe(401);

    expect((await getCategories()).status).toBe(401);
    expect(
      (
        await patchCategoryRoute(
          new Request("http://localhost/api/categories/1", { method: "PATCH" }),
          { params: Promise.resolve({ id: "1" }) }
        )
      ).status
    ).toBe(401);
    expect(
      (
        await deleteCategoryRoute(
          new Request("http://localhost/api/categories/1", {
            method: "DELETE",
          }),
          { params: Promise.resolve({ id: "1" }) }
        )
      ).status
    ).toBe(401);

    expect(
      (await getTransactions(new Request("http://localhost/api/transactions")))
        .status
    ).toBe(401);
    expect(
      (
        await postTransaction(
          new Request("http://localhost/api/transactions", { method: "POST" })
        )
      ).status
    ).toBe(401);
    expect(
      (
        await patchTransactionRoute(
          new Request("http://localhost/api/transactions/1", {
            method: "PATCH",
          }),
          { params: Promise.resolve({ id: "1" }) }
        )
      ).status
    ).toBe(401);
    expect(
      (
        await deleteTransactionRoute(
          new Request("http://localhost/api/transactions/1", {
            method: "DELETE",
          }),
          { params: Promise.resolve({ id: "1" }) }
        )
      ).status
    ).toBe(401);
  });

  it("strictly isolates accounts, categories, and transactions between users", async () => {
    // Alice creates custom account, category, and transaction
    await actAs(tokenA);

    const accRes = await postAccount(
      new Request("http://localhost/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Alice Bank", type: "bank" }),
      })
    );
    const aliceAcc = ((await accRes.json()) as { account: { id: string } })
      .account;

    const catRes = await postCategory(
      new Request("http://localhost/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Alice Secret Category" }),
      })
    );
    const aliceCat = ((await catRes.json()) as { category: { id: string } })
      .category;

    const txRes = await postTransaction(
      new Request("http://localhost/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 125000,
          type: "expense",
          occurredAt: "2026-11-27T10:00",
          merchant: "Alice Merchant",
          accountId: aliceAcc.id,
          categoryId: aliceCat.id,
        }),
      })
    );
    const aliceTx = ((await txRes.json()) as { transaction: { id: string } })
      .transaction;

    // Bob cannot see, reference, modify, or delete any of Alice's records
    await actAs(tokenB);

    const bobAccs = (await (await getAccounts()).json()) as {
      accounts: Array<{ id: string; name: string }>;
    };
    expect(bobAccs.accounts.some((a) => a.id === aliceAcc.id)).toBe(false);

    const bobCats = (await (await getCategories()).json()) as {
      categories: Array<{ id: string; name: string }>;
    };
    expect(bobCats.categories.some((c) => c.id === aliceCat.id)).toBe(false);

    const bobTxs = (
      await (
        await getTransactions(
          new Request(
            `http://localhost/api/transactions?categoryId=${aliceCat.id}&accountId=${aliceAcc.id}`
          )
        )
      ).json()
    ) as { transactions: Array<{ id: string }> };
    expect(bobTxs.transactions).toHaveLength(0);

    // Bob cannot create transaction referencing Alice's account/category
    const bobBadTx1 = await postTransaction(
      new Request("http://localhost/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 10000,
          type: "expense",
          occurredAt: "2026-11-27T11:00",
          accountId: aliceAcc.id,
        }),
      })
    );
    expect(bobBadTx1.status).toBe(400);

    const bobBadTx2 = await postTransaction(
      new Request("http://localhost/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 10000,
          type: "expense",
          occurredAt: "2026-11-27T11:00",
          categoryId: aliceCat.id,
        }),
      })
    );
    expect(bobBadTx2.status).toBe(400);

    // Bob cannot update or delete Alice's account, category, or transaction
    expect(
      (
        await patchAccountRoute(
          new Request(`http://localhost/api/accounts/${aliceAcc.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Stolen", type: "cash" }),
          }),
          { params: Promise.resolve({ id: aliceAcc.id }) }
        )
      ).status
    ).toBe(404);

    expect(
      (
        await deleteAccountRoute(
          new Request(`http://localhost/api/accounts/${aliceAcc.id}`, {
            method: "DELETE",
          }),
          { params: Promise.resolve({ id: aliceAcc.id }) }
        )
      ).status
    ).toBe(404);

    expect(
      (
        await patchCategoryRoute(
          new Request(`http://localhost/api/categories/${aliceCat.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Stolen" }),
          }),
          { params: Promise.resolve({ id: aliceCat.id }) }
        )
      ).status
    ).toBe(404);

    expect(
      (
        await deleteCategoryRoute(
          new Request(`http://localhost/api/categories/${aliceCat.id}`, {
            method: "DELETE",
          }),
          { params: Promise.resolve({ id: aliceCat.id }) }
        )
      ).status
    ).toBe(404);

    expect(
      (
        await patchTransactionRoute(
          new Request(`http://localhost/api/transactions/${aliceTx.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: 1,
              type: "expense",
              occurredAt: "2026-11-27T10:00",
            }),
          }),
          { params: Promise.resolve({ id: aliceTx.id }) }
        )
      ).status
    ).toBe(404);

    expect(
      (
        await deleteTransactionRoute(
          new Request(`http://localhost/api/transactions/${aliceTx.id}`, {
            method: "DELETE",
          }),
          { params: Promise.resolve({ id: aliceTx.id }) }
        )
      ).status
    ).toBe(404);

    // Alice's data remains intact
    await actAs(tokenA);
    const aliceTxs = (
      await (
        await getTransactions(new Request("http://localhost/api/transactions"))
      ).json()
    ) as { transactions: Array<{ id: string; amount: number }> };
    expect(aliceTxs.transactions).toHaveLength(1);
    expect(aliceTxs.transactions[0]?.amount).toBe(125000);
  });
});
