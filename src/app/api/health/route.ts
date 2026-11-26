import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";

export async function GET() {
  const timestamp = new Date().toISOString();
  const headers = { "Cache-Control": "no-store" };

  try {
    getDb().get(sql`SELECT 1`);
    return NextResponse.json(
      { status: "ok", db: "ok", timestamp },
      { status: 200, headers }
    );
  } catch {
    return NextResponse.json(
      { status: "error", db: "error", timestamp },
      { status: 503, headers }
    );
  }
}
