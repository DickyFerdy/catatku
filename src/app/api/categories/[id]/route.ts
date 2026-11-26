import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { parseJsonBody, requireApiUserId } from "@/lib/http";
import {
  categoryInputSchema,
  deleteCategory,
  updateCategory,
} from "@/lib/queries/accounts-categories";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiUserId();
  if (auth.error) return auth.error;

  const body = await parseJsonBody(request);
  if (body.error) return body.error;

  const parsed = categoryInputSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 }
    );
  }

  const { id } = await context.params;
  const result = await updateCategory(getDb(), auth.userId, id, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ category: result.category }, { status: 200 });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiUserId();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const result = await deleteCategory(getDb(), auth.userId, id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
