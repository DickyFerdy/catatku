import { resolve } from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb } from "./index";

export function runMigrations(databaseUrl?: string) {
  const { db, sqlite } = createDb(databaseUrl);
  try {
    migrate(db, {
      migrationsFolder: resolve(process.cwd(), "src/db/migrations"),
    });
  } finally {
    sqlite.close();
  }
}

if (require.main === module) {
  runMigrations();
  console.log("Database migrations applied successfully.");
}
