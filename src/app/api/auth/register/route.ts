import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { authInputSchema } from "@/lib/auth/schemas";
import { registerUser } from "@/lib/auth/service";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Payload JSON tidak valid" },
      { status: 400 }
    );
  }

  const parsed = authInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 }
    );
  }

  const result = await registerUser(getDb(), parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const token = await createSessionToken(result.user.id);
  const response = NextResponse.json({ user: result.user }, { status: 201 });
  setSessionCookie(response, token);
  return response;
}
