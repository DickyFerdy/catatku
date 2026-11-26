import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { parseJsonBody, requireApiUserId } from "@/lib/http";
import {
  categoryInputSchema,
  createCategory,
  listCategories,
} from "@/lib/queries/accounts-categories";

export async function GET() {
  const auth = await requireApiUserId();
  if (auth.error) return auth.error;

  const items = await listCategories(getDb(), auth.userId);
  return NextResponse.json({ categories: items }, { status: 200 });
}

export async function POST(request: Request) {
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

  const category = await createCategory(getDb(), auth.userId, parsed.data);
  return NextResponse.json({ category }, { status: 201 });
}
