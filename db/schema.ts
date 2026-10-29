import { pgTable, serial, text, boolean, timestamp, index } from "drizzle-orm/pg-core";

// user_id holds the Netlify Identity user id
export const notes = pgTable(
  "notes",
  {
    id: serial().primaryKey(),
    userId: text("user_id").notNull(),
    content: text().notNull(),
    color: text().notNull().default("yellow"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("notes_user_id_idx").on(t.userId)],
);

export const todos = pgTable(
  "todos",
  {
    id: serial().primaryKey(),
    userId: text("user_id").notNull(),
    title: text().notNull(),
    done: boolean().notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("todos_user_id_idx").on(t.userId)],
);
