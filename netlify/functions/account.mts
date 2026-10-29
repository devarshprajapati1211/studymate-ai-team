import type { Config } from "@netlify/functions";
import { AuthError, admin, type User } from "@netlify/identity";
import { isSameOrigin } from "../../lib/auth.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function findUserByEmail(email: string): Promise<User | null> {
  const perPage = 100;
  for (let page = 1; page <= 50; page++) {
    const users = await admin.listUsers({ page, perPage });
    const match = users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match;
    if (users.length < perPage) return null;
  }
  return null;
}

// Creates accounts that are confirmed straight away, so students can log in without waiting for an email
export default async (req: Request) => {
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  if (!isSameOrigin(req)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return Response.json({ error: "Please enter a valid email address." }, { status: 400 });

  try {
    if (new URL(req.url).pathname.endsWith("/signup")) {
      const password = String(body.password ?? "");
      const name = String(body.name ?? "").trim().slice(0, 100);
      if (password.length < 8) {
        return Response.json({ error: "Please choose a password with at least 8 characters." }, { status: 400 });
      }
      if (await findUserByEmail(email)) {
        return Response.json({ error: "This email is already registered. Try logging in instead." }, { status: 409 });
      }
      await admin.createUser({ email, password, data: { user_metadata: { full_name: name } } });
      return Response.json({ ok: true }, { status: 201 });
    }

    // Older accounts were created needing email confirmation; confirm them so the password login can go through.
    // This only marks the email confirmed — logging in still requires the correct password.
    const user = await findUserByEmail(email);
    if (user && !user.confirmedAt) await admin.updateUser(user.id, { confirm: true });
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    const message = error instanceof AuthError ? error.message : "";
    if (/already/i.test(message)) {
      return Response.json({ error: "This email is already registered. Try logging in instead." }, { status: 409 });
    }
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
};

export const config: Config = {
  path: ["/api/account/signup", "/api/account/confirm"],
};
