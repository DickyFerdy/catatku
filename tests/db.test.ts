import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, describe, expect, it } from "vitest";
import { createDb } from "@/db";
import {
  accounts,
  categories,
  extractionRuns,
  receipts,
  transactions,
  users,
} from "@/db/schema";

describe("database schema & migrations", () => {
  const cleanups: Array<() => void> = [];

  afterEach(() => {
    while (cleanups.length > 0) {
      cleanups.pop()?.();
    }
  });

  function setupMemoryDb() {
    const { db, sqlite } = createDb(":memory:");
    cleanups.push(() => sqlite.close());
    migrate(db, {
      migrationsFolder: resolve(process.cwd(), "src/db/migrations"),
    });
    return { db, sqlite };
  }

  it("creates all tables and idx_tx_user_date index", () => {
    const { sqlite } = setupMemoryDb();

    const tables = sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle_%'"
      )
      .all() as Array<{ name: string }>;

    expect(tables.map((t) => t.name).sort()).toEqual([
      "accounts",
      "categories",
      "extraction_runs",
      "receipts",
      "transactions",
      "users",
    ]);

    const indexes = sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_tx_user_date'"
      )
      .all() as Array<{ name: string }>;

    expect(indexes).toHaveLength(1);
  });

  it("enforces foreign keys and cascades deletes from users", async () => {
    const { db } = setupMemoryDb();
    const now = new Date().toISOString();

    await db.insert(users).values({
      id: "u1",
      email: "test@example.com",
      passwordHash: "hashed",
      createdAt: now,
    });

    await db.insert(accounts).values({
      id: "a1",
      userId: "u1",
      name: "GoPay",
      type: "ewallet",
    });

    await db.insert(categories).values({
      id: "c1",
      userId: "u1",
      name: "Makan",
    });

    await db.insert(receipts).values({
      id: "r1",
      userId: "u1",
      imagePath: null,
      itemsJson: "[]",
      total: 35000,
      createdAt: now,
    });

    await db.insert(transactions).values({
      id: "t1",
      userId: "u1",
      amount: 35000,
      type: "expense",
      occurredAt: now,
      merchant: "Warteg",
      note: "makan siang",
      categoryId: "c1",
      accountId: "a1",
      source: "chat",
      receiptId: "r1",
      createdAt: now,
    });

    await db.insert(extractionRuns).values({
      id: "e1",
      userId: "u1",
      kind: "chat",
      strategy: "A",
      promptVersion: "parse-v1",
      inputTokens: 100,
      outputTokens: 50,
      latencyMs: 500,
      warningsJson: "[]",
      userEdited: 0,
      createdAt: now,
    });

    await db.delete(users).where(eq(users.id, "u1"));

    expect(await db.select().from(accounts)).toHaveLength(0);
    expect(await db.select().from(categories)).toHaveLength(0);
    expect(await db.select().from(receipts)).toHaveLength(0);
    expect(await db.select().from(transactions)).toHaveLength(0);
    expect(await db.select().from(extractionRuns)).toHaveLength(0);
  });
});
