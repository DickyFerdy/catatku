import { resolve } from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as dbModule from "@/db";
import * as sessionModule from "@/lib/auth/session";
import { registerUser } from "@/lib/auth/service";
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_CATEGORIES,
  listAccounts,
  listCategories,
} from "@/lib/queries/accounts-categories";
import { GET as getAccounts, POST as postAccount } from "@/app/api/accounts/route";
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

describe("accounts & categories CRUD + defaults + isolation", () => {
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

  it("seeds default accounts and categories on user registration", async () => {
    const accs = await listAccounts(db, userAId);
    const cats = await listCategories(db, userAId);

    expect(accs.map((a) => a.name).sort()).toEqual(
      DEFAULT_ACCOUNTS.map((a) => a.name).sort()
    );
    expect(cats.map((c) => c.name).sort()).toEqual(
      [...DEFAULT_CATEGORIES].sort()
    );
  });

  it("supports full CRUD for accounts and isolates users", async () => {
    mockUser(userAId);

    const createRes = await postAccount(
      new Request("http://localhost/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "OVO", type: "ewallet" }),
      })
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as {
      account: { id: string; name: string; type: string };
    };
    expect(created.account.name).toBe("OVO");

    const listRes = await getAccounts();
    const listData = (await listRes.json()) as {
      accounts: Array<{ id: string; name: string }>;
    };
    expect(listData.accounts.some((a) => a.id === created.account.id)).toBe(true);

    // User B cannot update or delete User A's account
    mockUser(userBId);
    const forbiddenPatch = await patchAccountRoute(
      new Request(`http://localhost/api/accounts/${created.account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Hacked", type: "cash" }),
      }),
      { params: Promise.resolve({ id: created.account.id }) }
    );
    expect(forbiddenPatch.status).toBe(404);

    const forbiddenDelete = await deleteAccountRoute(
      new Request(`http://localhost/api/accounts/${created.account.id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: created.account.id }) }
    );
    expect(forbiddenDelete.status).toBe(404);

    // User A can update and delete their own account
    mockUser(userAId);
    const patchRes = await patchAccountRoute(
      new Request(`http://localhost/api/accounts/${created.account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "OVO Premier", type: "ewallet" }),
      }),
      { params: Promise.resolve({ id: created.account.id }) }
    );
    expect(patchRes.status).toBe(200);
    expect((await patchRes.json()).account.name).toBe("OVO Premier");

    const delRes = await deleteAccountRoute(
      new Request(`http://localhost/api/accounts/${created.account.id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: created.account.id }) }
    );
    expect(delRes.status).toBe(200);
  });

  it("supports full CRUD for categories and isolates users", async () => {
    mockUser(userAId);

    const createRes = await postCategory(
      new Request("http://localhost/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Kopi" }),
      })
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as {
      category: { id: string; name: string };
    };
    expect(created.category.name).toBe("Kopi");

    const listRes = await getCategories();
    const listData = (await listRes.json()) as {
      categories: Array<{ id: string; name: string }>;
    };
    expect(listData.categories.some((c) => c.id === created.category.id)).toBe(
      true
    );

    mockUser(userBId);
    const forbiddenDelete = await deleteCategoryRoute(
      new Request(`http://localhost/api/categories/${created.category.id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: created.category.id }) }
    );
    expect(forbiddenDelete.status).toBe(404);

    mockUser(userAId);
    const patchRes = await patchCategoryRoute(
      new Request(`http://localhost/api/categories/${created.category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Ngopi" }),
      }),
      { params: Promise.resolve({ id: created.category.id }) }
    );
    expect(patchRes.status).toBe(200);
    expect((await patchRes.json()).category.name).toBe("Ngopi");

    const delRes = await deleteCategoryRoute(
      new Request(`http://localhost/api/categories/${created.category.id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: created.category.id }) }
    );
    expect(delRes.status).toBe(200);
  });
});
