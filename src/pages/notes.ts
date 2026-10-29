import { api, escapeHtml, initPage, toast } from "../app";

type Note = { id: number; content: string; color: string; createdAt: string };

const list = document.querySelector<HTMLDivElement>("#notes")!;
const form = document.querySelector<HTMLFormElement>("#note-form")!;
const textarea = document.querySelector<HTMLTextAreaElement>("#note")!;
const swatches = [...document.querySelectorAll<HTMLButtonElement>(".swatch")];
let notes: Note[] = [];
let color = "yellow";

function render() {
  if (!notes.length) {
    list.innerHTML = `<div class="empty">No notes yet. Add your first one above ✏️</div>`;
    return;
  }
  list.innerHTML = `<div class="notes-grid">${notes
    .map(
      (n) => `<div class="sticky bg-${n.color}">
        ${escapeHtml(n.content)}
        <div class="sticky-foot">
          <span>${new Date(n.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
          <button class="icon-btn" data-delete="${n.id}" aria-label="Delete note">✕</button>
        </div>
      </div>`,
    )
    .join("")}</div>`;
}

await initPage({ requireAuth: true });

swatches.forEach((s) =>
  s.addEventListener("click", () => {
    color = s.dataset.color!;
    swatches.forEach((x) => x.setAttribute("aria-pressed", String(x === s)));
  }),
);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const content = textarea.value.trim();
  if (!content) return;
  try {
    const note = await api<Note>("/api/notes", { body: { content, color } });
    notes.unshift(note);
    textarea.value = "";
    render();
  } catch (error) {
    toast((error as Error).message);
  }
});

list.addEventListener("click", async (e) => {
  const button = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-delete]");
  if (!button) return;
  const id = Number(button.dataset.delete);
  try {
    await api(`/api/notes/${id}`, { method: "DELETE" });
    notes = notes.filter((n) => n.id !== id);
    render();
  } catch (error) {
    toast((error as Error).message);
  }
});

try {
  notes = await api<Note[]>("/api/notes");
  render();
} catch (error) {
  list.innerHTML = `<div class="empty">Couldn't load your notes. Please refresh.</div>`;
}
