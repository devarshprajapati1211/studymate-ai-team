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
  if (!origin) return true;
  // Compare hosts only: behind the CDN, req.url may not carry the browser's scheme or host
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const hosts = [new URL(req.url).host, req.headers.get("x-forwarded-host"), req.headers.get("host")];
  return hosts.some((h) => h && h.split(",")[0].trim() === originHost);
}
