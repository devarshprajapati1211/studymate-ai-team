import { getUser, type User } from "@netlify/identity";

// Returns the logged-in Identity user, or a 401 response to send back
export async function requireUser(): Promise<User | Response> {
  const user = await getUser();
  if (!user) return Response.json({ error: "Please log in first." }, { status: 401 });
  return user;
}

// Rejects cross-site writes riding on the auth cookie
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  return !origin || origin === new URL(req.url).origin;
}
