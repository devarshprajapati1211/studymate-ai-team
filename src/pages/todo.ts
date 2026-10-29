import { api, escapeHtml, initPage, toast } from "../app";

type Todo = { id: number; title: string; done: boolean };

const list = document.querySelector<HTMLUListElement>("#todos")!;
const form = document.querySelector<HTMLFormElement>("#todo-form")!;
const input = document.querySelector<HTMLInputElement>("#title")!;
let todos: Todo[] = [];

function render() {
  const done = todos.filter((t) => t.done).length;
  document.querySelector("#progress-label")!.textContent = todos.length
    ? `${done} of ${todos.length} tasks done`
    : "No tasks yet — add one above.";
  document.querySelector<HTMLDivElement>("#progress")!.style.width = todos.length ? `${(done / todos.length) * 100}%` : "0";
  list.innerHTML = [...todos]
    .sort((a, b) => Number(a.done) - Number(b.done))
    .map(
      (t) => `<li class="todo-item ${t.done ? "done" : ""}">
        <input type="checkbox" data-toggle="${t.id}" ${t.done ? "checked" : ""} aria-label="Mark done" />
        <span>${escapeHtml(t.title)}</span>
        <button class="icon-btn" data-delete="${t.id}" aria-label="Delete task">✕</button>
      </li>`,
    )
    .join("");
}

await initPage({ requireAuth: true });

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = input.value.trim();
  if (!title) return;
  try {
    todos.push(await api<Todo>("/api/todos", { body: { title } }));
    input.value = "";
    render();
  } catch (error) {
    toast((error as Error).message);
  }
});

list.addEventListener("change", async (e) => {
  const box = e.target as HTMLInputElement;
  if (!box.dataset.toggle) return;
  const id = Number(box.dataset.toggle);
  try {
    const updated = await api<Todo>(`/api/todos/${id}`, { method: "PATCH", body: { done: box.checked } });
    todos = todos.map((t) => (t.id === id ? updated : t));
    render();
  } catch (error) {
    box.checked = !box.checked;
    toast((error as Error).message);
  }
});

list.addEventListener("click", async (e) => {
  const button = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-delete]");
  if (!button) return;
  const id = Number(button.dataset.delete);
  try {
    await api(`/api/todos/${id}`, { method: "DELETE" });
    todos = todos.filter((t) => t.id !== id);
    render();
  } catch (error) {
    toast((error as Error).message);
  }
});

try {
  todos = await api<Todo[]>("/api/todos");
  render();
} catch {
  document.querySelector("#progress-label")!.textContent = "Couldn't load your tasks. Please refresh.";
}
