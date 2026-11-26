import { NextResponse } from "next/server";
import { getSessionUserIdFromCookies } from "@/lib/auth/session";

export async function requireApiUserId(): Promise<
  { userId: string; error?: never } | { userId?: never; error: NextResponse }
> {
  const userId = await getSessionUserIdFromCookies();
  if (!userId) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { userId };
}

export async function parseJsonBody(
  request: Request
): Promise<
  { data: unknown; error?: never } | { data?: never; error: NextResponse }
> {
  try {
    const data: unknown = await request.json();
    return { data };
  } catch {
    return {
      error: NextResponse.json(
        { error: "Payload JSON tidak valid" },
        { status: 400 }
      ),
    };
  }
}
