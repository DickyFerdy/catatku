import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { parseJsonBody, requireApiUserId } from "@/lib/http";
import {
  createTransaction,
  createTransactionSchema,
  listTransactions,
  listTransactionsFilterSchema,
} from "@/lib/queries/transactions";

export async function GET(request: Request) {
  const auth = await requireApiUserId();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const rawFilter = {
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
    categoryId: searchParams.get("categoryId") || undefined,
    accountId: searchParams.get("accountId") || undefined,
  };

  const parsed = listTransactionsFilterSchema.safeParse(rawFilter);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Filter tidak valid" },
      { status: 400 }
    );
  }

  const items = await listTransactions(getDb(), auth.userId, parsed.data);
  return NextResponse.json({ transactions: items }, { status: 200 });
}

export async function POST(request: Request) {
  const auth = await requireApiUserId();
  if (auth.error) return auth.error;

  const body = await parseJsonBody(request);
  if (body.error) return body.error;

  const parsed = createTransactionSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 }
    );
  }

  const result = await createTransaction(getDb(), auth.userId, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ transaction: result.transaction }, { status: 201 });
}
