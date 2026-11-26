import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { parseJsonBody, requireApiUserId } from "@/lib/http";
import {
  accountInputSchema,
  createAccount,
  listAccounts,
} from "@/lib/queries/accounts-categories";

export async function GET() {
  const auth = await requireApiUserId();
  if (auth.error) return auth.error;

  const items = await listAccounts(getDb(), auth.userId);
  return NextResponse.json({ accounts: items }, { status: 200 });
}

export async function POST(request: Request) {
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

  const account = await createAccount(getDb(), auth.userId, parsed.data);
  return NextResponse.json({ account }, { status: 201 });
}
