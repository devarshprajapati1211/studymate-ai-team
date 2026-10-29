import type { Config, Context } from "@netlify/functions";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { notes } from "../../db/schema.js";
import { isSameOrigin, requireUser } from "../../lib/auth.js";

const COLORS = ["yellow", "pink", "blue", "green"];

export default async (req: Request, context: Context) => {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (req.method !== "GET" && !isSameOrigin(req)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = context.params.id ? Number(context.params.id) : null;

  if (req.method === "GET" && id === null) {
    const rows = await db
      .select()
      .from(notes)
      .where(eq(notes.userId, user.id))
      .orderBy(desc(notes.createdAt));
    return Response.json(rows);
  }

  if (req.method === "POST" && id === null) {
    const body = await req.json().catch(() => ({}));
    const content = String(body.content ?? "").trim().slice(0, 2000);
    if (!content) return Response.json({ error: "Note cannot be empty." }, { status: 400 });
    const color = COLORS.includes(body.color) ? body.color : "yellow";
    const [note] = await db.insert(notes).values({ userId: user.id, content, color }).returning();
    return Response.json(note, { status: 201 });
  }

  if (req.method === "DELETE" && id !== null && Number.isInteger(id)) {
    await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, user.id)));
    return new Response(null, { status: 204 });
  }

  return Response.json({ error: "Not found" }, { status: 404 });
};

export const config: Config = {
  path: ["/api/notes", "/api/notes/:id"],
};
