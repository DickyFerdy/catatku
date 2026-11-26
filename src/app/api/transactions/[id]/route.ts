import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { parseJsonBody, requireApiUserId } from "@/lib/http";
import {
  deleteTransaction,
  updateTransaction,
  updateTransactionSchema,
} from "@/lib/queries/transactions";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiUserId();
  if (auth.error) return auth.error;

  const body = await parseJsonBody(request);
  if (body.error) return body.error;

  const parsed = updateTransactionSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 }
    );
  }

  const { id } = await context.params;
  const result = await updateTransaction(getDb(), auth.userId, id, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ transaction: result.transaction }, { status: 200 });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiUserId();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const result = await deleteTransaction(getDb(), auth.userId, id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
