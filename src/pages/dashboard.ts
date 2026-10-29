import { api, displayName, initPage } from "../app";

const user = await initPage({ requireAuth: true });
if (user) {
  document.querySelector("#name")!.textContent = displayName(user);
  document.querySelector("#today")!.textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const [todos, notes] = await Promise.all([
    api<{ done: boolean }[]>("/api/todos").catch(() => null),
    api<unknown[]>("/api/notes").catch(() => null),
  ]);
  if (todos) {
    document.querySelector("#stat-open")!.textContent = String(todos.filter((t) => !t.done).length);
    document.querySelector("#stat-done")!.textContent = String(todos.filter((t) => t.done).length);
  }
  if (notes) document.querySelector("#stat-notes")!.textContent = String(notes.length);
}
