import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { parseJsonBody, requireApiUserId } from "@/lib/http";
import {
  accountInputSchema,
  deleteAccount,
  updateAccount,
} from "@/lib/queries/accounts-categories";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiUserId();
  if (auth.error) return auth.error;

  const body = await parseJsonBody(request);
  if (body.error) return body.error;

  const parsed = accountInputSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 }
    );
  }

  const { id } = await context.params;
  const result = await updateAccount(getDb(), auth.userId, id, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ account: result.account }, { status: 200 });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiUserId();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const result = await deleteAccount(getDb(), auth.userId, id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
