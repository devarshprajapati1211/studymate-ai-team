import { api, escapeHtml, initPage, toast } from "../app";

type Card = { front: string; back: string };

const form = document.querySelector<HTMLFormElement>("#flash-form")!;
const button = document.querySelector<HTMLButtonElement>("#generate")!;
const container = document.querySelector<HTMLDivElement>("#cards")!;

await initPage({ requireAuth: true });

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  button.disabled = true;
  button.innerHTML = `<span class="spinner"></span> Making cards…`;
  try {
    const { flashcards } = await api<{ flashcards: Card[] }>("/api/ai/flashcards", {
      body: { topic: document.querySelector<HTMLInputElement>("#topic")!.value },
    });
    if (!flashcards.length) throw new Error("The AI didn't return any cards. Please try again.");
    container.innerHTML = `<div class="flash-grid">${flashcards
      .map(
        (c, i) => `<button class="flash" aria-label="Flashcard ${i + 1}, click to flip">
          <div class="flash-inner">
            <div class="flash-face flash-front"><small>${i + 1} · Question</small>${escapeHtml(c.front)}</div>
            <div class="flash-face flash-back"><small>Answer</small>${escapeHtml(c.back)}</div>
          </div>
        </button>`,
      )
      .join("")}</div>`;
  } catch (error) {
    toast((error as Error).message);
  } finally {
    button.disabled = false;
    button.textContent = "Make flashcards";
  }
});

container.addEventListener("click", (e) => {
  (e.target as HTMLElement).closest(".flash")?.classList.toggle("flipped");
});
