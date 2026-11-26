import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull(),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type", { enum: ["cash", "ewallet", "bank", "other"] }).notNull(),
});

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

export const receipts = sqliteTable("receipts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  imagePath: text("image_path"),
  itemsJson: text("items_json"),
  total: integer("total"),
  createdAt: text("created_at").notNull(),
});

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    type: text("type", { enum: ["expense", "income"] }).notNull(),
    occurredAt: text("occurred_at").notNull(),
    merchant: text("merchant"),
    note: text("note"),
    categoryId: text("category_id").references(() => categories.id),
    accountId: text("account_id").references(() => accounts.id),
    source: text("source", { enum: ["manual", "chat", "receipt"] }).notNull(),
    receiptId: text("receipt_id").references(() => receipts.id),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_tx_user_date").on(table.userId, table.occurredAt)]
);

export const extractionRuns = sqliteTable("extraction_runs", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["chat", "receipt"] }).notNull(),
  strategy: text("strategy"),
  promptVersion: text("prompt_version"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  latencyMs: integer("latency_ms"),
  warningsJson: text("warnings_json"),
  userEdited: integer("user_edited"),
  createdAt: text("created_at").notNull(),
});
