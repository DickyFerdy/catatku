import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { AppDatabase } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import {
  jakartaEndOfDayUtcIso,
  jakartaStartOfDayUtcIso,
  normalizeToUtcIso,
} from "@/lib/date";

export const TRANSACTION_TYPES = ["expense", "income"] as const;
export const TRANSACTION_SOURCES = ["manual", "chat", "receipt"] as const;

export const createTransactionSchema = z.object({
  amount: z
    .number({ message: "Nominal harus berupa angka" })
    .int("Nominal harus bilangan bulat rupiah")
    .positive("Nominal harus lebih dari 0"),
  type: z.enum(TRANSACTION_TYPES, {
    message: "Tipe transaksi harus expense atau income",
  }),
  occurredAt: z.string().trim().min(1, "Tanggal transaksi wajib diisi"),
  merchant: z
    .string()
    .trim()
    .max(100, "Nama toko maksimal 100 karakter")
    .nullable()
    .optional(),
  note: z
    .string()
    .trim()
    .max(500, "Catatan maksimal 500 karakter")
    .nullable()
    .optional(),
  categoryId: z.string().trim().min(1).nullable().optional(),
  accountId: z.string().trim().min(1).nullable().optional(),
  source: z.enum(TRANSACTION_SOURCES).default("manual"),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export async function createTransaction(
  db: AppDatabase,
  userId: string,
  input: CreateTransactionInput
) {
  const occurredAtUtc = normalizeToUtcIso(input.occurredAt);
  if (!occurredAtUtc) {
    return {
      ok: false as const,
      status: 400 as const,
      error: "Format tanggal tidak valid",
    };
  }

  const categoryId = input.categoryId || null;
  if (categoryId) {
    const foundCategory = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(eq(categories.id, categoryId), eq(categories.userId, userId))
      )
      .limit(1);

    if (foundCategory.length === 0) {
      return {
        ok: false as const,
        status: 400 as const,
        error: "Kategori tidak ditemukan",
      };
    }
  }

  const accountId = input.accountId || null;
  if (accountId) {
    const foundAccount = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
      .limit(1);

    if (foundAccount.length === 0) {
      return {
        ok: false as const,
        status: 400 as const,
        error: "Sumber dana tidak ditemukan",
      };
    }
  }

  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const merchant = input.merchant ? input.merchant : null;
  const note = input.note ? input.note : null;

  await db.insert(transactions).values({
    id,
    userId,
    amount: input.amount,
    type: input.type,
    occurredAt: occurredAtUtc,
    merchant,
    note,
    categoryId,
    accountId,
    source: input.source,
    receiptId: null,
    createdAt,
  });

  return {
    ok: true as const,
    transaction: {
      id,
      userId,
      amount: input.amount,
      type: input.type,
      occurredAt: occurredAtUtc,
      merchant,
      note,
      categoryId,
      accountId,
      source: input.source,
      createdAt,
    },
  };
}

const dateFilterRegex = /^\d{4}-\d{2}-\d{2}$/;

export const listTransactionsFilterSchema = z.object({
  from: z
    .string()
    .regex(dateFilterRegex, "Format tanggal 'from' harus YYYY-MM-DD")
    .optional(),
  to: z
    .string()
    .regex(dateFilterRegex, "Format tanggal 'to' harus YYYY-MM-DD")
    .optional(),
  categoryId: z.string().trim().min(1).optional(),
  accountId: z.string().trim().min(1).optional(),
});

export type ListTransactionsFilter = z.infer<
  typeof listTransactionsFilterSchema
>;

export async function listTransactions(
  db: AppDatabase,
  userId: string,
  filter: ListTransactionsFilter = {}
) {
  const conditions: SQL[] = [eq(transactions.userId, userId)];

  if (filter.from) {
    const startUtc = jakartaStartOfDayUtcIso(filter.from);
    if (startUtc) {
      conditions.push(gte(transactions.occurredAt, startUtc));
    }
  }

  if (filter.to) {
    const endUtc = jakartaEndOfDayUtcIso(filter.to);
    if (endUtc) {
      conditions.push(lte(transactions.occurredAt, endUtc));
    }
  }

  if (filter.categoryId) {
    conditions.push(eq(transactions.categoryId, filter.categoryId));
  }

  if (filter.accountId) {
    conditions.push(eq(transactions.accountId, filter.accountId));
  }

  return db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      type: transactions.type,
      occurredAt: transactions.occurredAt,
      merchant: transactions.merchant,
      note: transactions.note,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      accountId: transactions.accountId,
      accountName: accounts.name,
      source: transactions.source,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .leftJoin(
      categories,
      and(
        eq(transactions.categoryId, categories.id),
        eq(categories.userId, userId)
      )
    )
    .leftJoin(
      accounts,
      and(eq(transactions.accountId, accounts.id), eq(accounts.userId, userId))
    )
    .where(and(...conditions))
    .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt));
}
