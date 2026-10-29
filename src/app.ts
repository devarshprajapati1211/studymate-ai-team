import "./style.css";
import { getUser, handleAuthCallback, logout, type User } from "@netlify/identity";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/chatbot", label: "AI Tutor" },
  { href: "/quiz", label: "Quiz" },
  { href: "/flashcards", label: "Flashcards" },
  { href: "/notes", label: "Notes" },
  { href: "/todo", label: "To-Do" },
  { href: "/pomodoro", label: "Pomodoro" },
];

export function displayName(user: User): string {
  const meta = user.userMetadata as { full_name?: string } | undefined;
  return meta?.full_name || user.name || user.email?.split("@")[0] || "Student";
}

function renderHeader(user: User | null) {
  const path = location.pathname.replace(/\.html$/, "").replace(/\/index$/, "/");
  const header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML = `
    <a class="brand" href="${user ? "/dashboard" : "/"}"><span class="brand-mark">S</span>StudyMate<em>AI</em></a>
    <button class="nav-toggle" aria-label="Menu" aria-expanded="false">☰</button>
    <nav class="site-nav">
      ${
        user
          ? NAV.map((n) => `<a href="${n.href}" ${path === n.href ? 'aria-current="page"' : ""}>${n.label}</a>`).join("") +
            `<button class="btn btn-ghost btn-sm" data-logout>Log out</button>`
          : `<a href="/pomodoro" ${path === "/pomodoro" ? 'aria-current="page"' : ""}>Pomodoro</a>
             <a href="/login">Log in</a><a class="btn btn-sm" href="/register">Get started</a>`
      }
    </nav>`;
  document.body.prepend(header);

  const toggle = header.querySelector<HTMLButtonElement>(".nav-toggle")!;
  toggle.addEventListener("click", () => {
    const open = header.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  header.querySelector("[data-logout]")?.addEventListener("click", async () => {
    await logout().catch(() => {});
    location.href = "/";
  });
}

/** Processes auth links, draws the header and, for protected pages, sends guests to the login page. */
export async function initPage({ requireAuth = false } = {}): Promise<User | null> {
  try {
    const result = await handleAuthCallback();
    if (result?.type === "recovery") {
      location.replace("/login?reset=1");
      return null;
    }
    if (result?.type === "confirmation" || result?.type === "oauth") {
      location.replace("/dashboard");
      return null;
    }
  } catch (error) {
    console.error(error);
  }

  const user = await getUser();
  if (requireAuth && !user) {
    location.replace(`/login?next=${encodeURIComponent(location.pathname)}`);
    return null;
  }
  renderHeader(user);
  document.body.classList.add("ready");
  return user;
}

export async function api<T = unknown>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "same-origin",
  });
  if (res.status === 401) {
    location.href = `/login?next=${encodeURIComponent(location.pathname)}`;
    throw new Error("Please log in again.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data as T;
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function toast(message: string, kind: "error" | "success" = "error") {
  const el = document.createElement("div");
  el.className = `toast toast-${kind}`;
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), 4000);
}
