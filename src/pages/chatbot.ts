import { api, escapeHtml, initPage, toast } from "../app";

type Turn = { role: "user" | "model"; text: string };

const log = document.querySelector<HTMLDivElement>("#log")!;
const form = document.querySelector<HTMLFormElement>("#chat-form")!;
const input = document.querySelector<HTMLTextAreaElement>("#question")!;
const send = document.querySelector<HTMLButtonElement>("#send")!;
const history: Turn[] = [];

// Minimal Markdown: code blocks, inline code, bold, italics, lists and paragraphs
function renderMarkdown(text: string): string {
  const blocks: string[] = [];
  let html = escapeHtml(text).replace(/```\w*\n?([\s\S]*?)```/g, (_, code) => {
    blocks.push(`<pre><code>${code.trim()}</code></pre>`);
    return `\u0000${blocks.length - 1}\u0000`;
  });
  html = html
    .replace(/`([^`\n]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/^#{1,6}\s+(.+)$/gm, "<strong>$1</strong>");
  html = html
    .split(/\n{2,}/)
    .map((para) => {
      const lines = para.split("\n");
      if (lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))) {
        const tag = /^\s*\d/.test(lines[0]) ? "ol" : "ul";
        return `<${tag}>${lines.map((l) => `<li>${l.replace(/^\s*([-*•]|\d+[.)])\s+/, "")}</li>`).join("")}</${tag}>`;
      }
      return /^\u0000\d+\u0000$/.test(para.trim()) ? para : `<p>${lines.join("<br>")}</p>`;
    })
    .join("");
  return html.replace(/\u0000(\d+)\u0000/g, (_, i) => blocks[Number(i)]);
}

function addMessage(role: Turn["role"], text: string, extraClass = "") {
  const div = document.createElement("div");
  div.className = `msg msg-${role} ${extraClass}`;
  if (role === "user") div.textContent = text;
  else div.innerHTML = renderMarkdown(text);
  log.append(div);
  log.scrollTop = log.scrollHeight;
  return div;
}

async function ask(question: string) {
  addMessage("user", question);
  const typing = addMessage("model", "Thinking…", "msg-typing");
  send.disabled = true;
  try {
    const { answer } = await api<{ answer: string }>("/api/ai/chat", { body: { question, history } });
    typing.remove();
    addMessage("model", answer || "I couldn't come up with an answer — try rephrasing.");
    history.push({ role: "user", text: question }, { role: "model", text: answer });
  } catch (error) {
    typing.remove();
    toast((error as Error).message);
  } finally {
    send.disabled = false;
    input.focus();
  }
}

await initPage({ requireAuth: true });

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const question = input.value.trim();
  if (!question || send.disabled) return;
  input.value = "";
  ask(question);
});
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});
log.querySelectorAll<HTMLButtonElement>(".chip").forEach((chip) =>
  chip.addEventListener("click", () => !send.disabled && ask(chip.textContent!)),
);
