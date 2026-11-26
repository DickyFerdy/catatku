import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { parseJsonBody, requireApiUserId } from "@/lib/http";
import {
  createTransaction,
  createTransactionSchema,
} from "@/lib/queries/transactions";

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
