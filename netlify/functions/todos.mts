import type { Config, Context } from "@netlify/functions";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { todos } from "../../db/schema.js";
import { isSameOrigin, requireUser } from "../../lib/auth.js";

export default async (req: Request, context: Context) => {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (req.method !== "GET" && !isSameOrigin(req)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = context.params.id ? Number(context.params.id) : null;
  const ownRow = id !== null ? and(eq(todos.id, id), eq(todos.userId, user.id)) : undefined;

  if (req.method === "GET" && id === null) {
    const rows = await db
      .select()
      .from(todos)
      .where(eq(todos.userId, user.id))
      .orderBy(asc(todos.done), asc(todos.createdAt));
    return Response.json(rows);
  }

  if (req.method === "POST" && id === null) {
    const body = await req.json().catch(() => ({}));
    const title = String(body.title ?? "").trim().slice(0, 300);
    if (!title) return Response.json({ error: "Task cannot be empty." }, { status: 400 });
    const [todo] = await db.insert(todos).values({ userId: user.id, title }).returning();
    return Response.json(todo, { status: 201 });
  }

  if (req.method === "PATCH" && ownRow) {
    const body = await req.json().catch(() => ({}));
    const [todo] = await db.update(todos).set({ done: Boolean(body.done) }).where(ownRow).returning();
    return todo ? Response.json(todo) : Response.json({ error: "Not found" }, { status: 404 });
  }

  if (req.method === "DELETE" && ownRow) {
    await db.delete(todos).where(ownRow);
    return new Response(null, { status: 204 });
  }

  return Response.json({ error: "Not found" }, { status: 404 });
};

export const config: Config = {
  path: ["/api/todos", "/api/todos/:id"],
};
