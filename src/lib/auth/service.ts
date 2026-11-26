import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { AppDatabase } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, verifyPassword } from "./password";
import type { AuthInput } from "./schemas";

export type AuthUser = {
  id: string;
  email: string;
};

type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; status: 401 | 409; error: string };

export async function registerUser(
  db: AppDatabase,
  input: AuthInput
): Promise<AuthResult> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existing.length > 0) {
    return { ok: false, status: 409, error: "Email sudah terdaftar" };
  }

  const id = randomUUID();
  const passwordHash = await hashPassword(input.password);
  const createdAt = new Date().toISOString();

  await db.insert(users).values({
    id,
    email: input.email,
    passwordHash,
    createdAt,
  });

  return { ok: true, user: { id, email: input.email } };
}

export async function loginUser(
  db: AppDatabase,
  input: AuthInput
): Promise<AuthResult> {
  const found = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  const user = found[0];
  if (!user) {
    return { ok: false, status: 401, error: "Email atau password salah" };
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    return { ok: false, status: 401, error: "Email atau password salah" };
  }

  return { ok: true, user: { id: user.id, email: user.email } };
}
