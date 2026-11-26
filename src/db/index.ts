import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

function resolveDbPath(rawUrl?: string): string {
  const url = rawUrl ?? process.env.DATABASE_URL ?? "./data/app.db";
  return url.startsWith("file:") ? url.slice("file:".length) : url;
}

/**
 * Membuka koneksi SQLite baru dengan Drizzle ORM dan mengaktifkan foreign keys.
 */
export function createDb(databaseUrl?: string) {
  const dbPath = resolveDbPath(databaseUrl);
  if (dbPath !== ":memory:") {
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma("foreign_keys = ON");

  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

export type AppDatabase = ReturnType<typeof createDb>["db"];

let cached: ReturnType<typeof createDb> | null = null;

/**
 * Mengembalikan instance database tunggal untuk aplikasi.
 */
export function getDb(): AppDatabase {
  if (!cached) {
    cached = createDb();
  }
  return cached.db;
}
