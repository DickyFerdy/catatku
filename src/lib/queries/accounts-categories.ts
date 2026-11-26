import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import type { AppDatabase } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";

export const ACCOUNT_TYPES = ["cash", "ewallet", "bank", "other"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const accountInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama sumber dana wajib diisi")
    .max(50, "Nama sumber dana maksimal 50 karakter"),
  type: z.enum(ACCOUNT_TYPES, {
    message: "Tipe sumber dana harus cash, ewallet, bank, atau other",
  }),
});

export const categoryInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama kategori wajib diisi")
    .max(50, "Nama kategori maksimal 50 karakter"),
});

export type AccountInput = z.infer<typeof accountInputSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const DEFAULT_ACCOUNTS: ReadonlyArray<AccountInput> = [
  { name: "Tunai", type: "cash" },
  { name: "GoPay", type: "ewallet" },
  { name: "BCA", type: "bank" },
];

export const DEFAULT_CATEGORIES: ReadonlyArray<string> = [
  "Makan",
  "Transport",
  "Belanja",
  "Tagihan",
  "Hiburan",
  "Kesehatan",
  "Gaji",
  "Lainnya",
];

/**
 * Mengisi sumber dana dan kategori awal bawaan untuk pengguna baru.
 */
export async function seedDefaultAccountsAndCategories(
  db: AppDatabase,
  userId: string
): Promise<void> {
  await db.insert(accounts).values(
    DEFAULT_ACCOUNTS.map((acc) => ({
      id: randomUUID(),
      userId,
      name: acc.name,
      type: acc.type,
    }))
  );

  await db.insert(categories).values(
    DEFAULT_CATEGORIES.map((name) => ({
      id: randomUUID(),
      userId,
      name,
    }))
  );
}

export async function listAccounts(db: AppDatabase, userId: string) {
  return db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
    })
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .orderBy(asc(accounts.name));
}

export async function createAccount(
  db: AppDatabase,
  userId: string,
  input: AccountInput
) {
  const id = randomUUID();
  await db.insert(accounts).values({
    id,
    userId,
    name: input.name,
    type: input.type,
  });
  return { id, name: input.name, type: input.type };
}

export async function updateAccount(
  db: AppDatabase,
  userId: string,
  accountId: string,
  input: AccountInput
) {
  const result = await db
    .update(accounts)
    .set({ name: input.name, type: input.type })
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));

  if (result.changes === 0) {
    return { ok: false as const, status: 404 as const, error: "Sumber dana tidak ditemukan" };
  }

  return {
    ok: true as const,
    account: { id: accountId, name: input.name, type: input.type },
  };
}

export async function deleteAccount(
  db: AppDatabase,
  userId: string,
  accountId: string
) {
  const used = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(eq(transactions.accountId, accountId), eq(transactions.userId, userId))
    )
    .limit(1);

  if (used.length > 0) {
    return {
      ok: false as const,
      status: 409 as const,
      error: "Sumber dana masih dipakai oleh transaksi",
    };
  }

  const result = await db
    .delete(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));

  if (result.changes === 0) {
    return { ok: false as const, status: 404 as const, error: "Sumber dana tidak ditemukan" };
  }

  return { ok: true as const };
}

export async function listCategories(db: AppDatabase, userId: string) {
  return db
    .select({
      id: categories.id,
      name: categories.name,
    })
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(asc(categories.name));
}

export async function createCategory(
  db: AppDatabase,
  userId: string,
  input: CategoryInput
) {
  const id = randomUUID();
  await db.insert(categories).values({
    id,
    userId,
    name: input.name,
  });
  return { id, name: input.name };
}

export async function updateCategory(
  db: AppDatabase,
  userId: string,
  categoryId: string,
  input: CategoryInput
) {
  const result = await db
    .update(categories)
    .set({ name: input.name })
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));

  if (result.changes === 0) {
    return { ok: false as const, status: 404 as const, error: "Kategori tidak ditemukan" };
  }

  return {
    ok: true as const,
    category: { id: categoryId, name: input.name },
  };
}

export async function deleteCategory(
  db: AppDatabase,
  userId: string,
  categoryId: string
) {
  const used = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.categoryId, categoryId),
        eq(transactions.userId, userId)
      )
    )
    .limit(1);

  if (used.length > 0) {
    return {
      ok: false as const,
      status: 409 as const,
      error: "Kategori masih dipakai oleh transaksi",
    };
  }

  const result = await db
    .delete(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));

  if (result.changes === 0) {
    return { ok: false as const, status: 404 as const, error: "Kategori tidak ditemukan" };
  }

  return { ok: true as const };
}
