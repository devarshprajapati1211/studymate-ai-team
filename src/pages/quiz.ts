import { api, escapeHtml, initPage, toast } from "../app";

type Question = { question: string; options: string[]; answerIndex: number; explanation: string };

const form = document.querySelector<HTMLFormElement>("#quiz-form")!;
const button = document.querySelector<HTMLButtonElement>("#generate")!;
const container = document.querySelector<HTMLDivElement>("#quiz")!;
let quiz: Question[] = [];
let answered = 0;
let correct = 0;

function render() {
  container.innerHTML =
    quiz
      .map(
        (q, i) => `<div class="card quiz-q" data-q="${i}">
          <h3><span class="num">Q${i + 1}</span>${escapeHtml(q.question)}</h3>
          <div class="options">${q.options
            .map(
              (o, j) =>
                `<button class="option" data-option="${j}"><span class="letter">${"ABCD"[j] ?? j + 1}</span>${escapeHtml(o)}</button>`,
            )
            .join("")}</div>
        </div>`,
      )
      .join("") + `<div class="score" id="score" hidden></div>`;
}

function updateScore() {
  if (answered < quiz.length) return;
  const score = container.querySelector<HTMLDivElement>("#score")!;
  score.hidden = false;
  score.innerHTML = `<div><span class="muted">Your score</span><br><strong>${correct} / ${quiz.length}</strong></div>
    <button class="btn" id="again">New quiz on this topic</button>`;
  score.querySelector("#again")!.addEventListener("click", () => form.requestSubmit());
}

await initPage({ requireAuth: true });

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  button.disabled = true;
  button.innerHTML = `<span class="spinner"></span> Generating…`;
  try {
    const data = await api<{ quiz: Question[] }>("/api/ai/quiz", {
      body: {
        topic: document.querySelector<HTMLInputElement>("#topic")!.value,
        difficulty: document.querySelector<HTMLSelectElement>("#difficulty")!.value,
        count: Number(document.querySelector<HTMLInputElement>("#count")!.value),
      },
    });
    quiz = data.quiz.filter((q) => Array.isArray(q.options) && q.options.length >= 2);
    if (!quiz.length) throw new Error("The AI didn't return a quiz. Please try again.");
    answered = correct = 0;
    render();
    container.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    toast((error as Error).message);
  } finally {
    button.disabled = false;
    button.textContent = "Generate quiz";
  }
});

container.addEventListener("click", (e) => {
  const option = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-option]");
  if (!option || option.disabled) return;
  const card = option.closest<HTMLDivElement>("[data-q]")!;
  const q = quiz[Number(card.dataset.q)];
  const chosen = Number(option.dataset.option);
  card.querySelectorAll<HTMLButtonElement>("[data-option]").forEach((b) => {
    b.disabled = true;
    if (Number(b.dataset.option) === q.answerIndex) b.classList.add("correct");
  });
  if (chosen === q.answerIndex) correct++;
  else option.classList.add("wrong");
  const explain = document.createElement("p");
  explain.className = "explain";
  explain.textContent = `${chosen === q.answerIndex ? "✅ Correct!" : "❌ Not quite."} ${q.explanation}`;
  card.append(explain);
  answered++;
  updateScore();
});
