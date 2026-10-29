import { initPage } from "../app";

const MODES = {
  focus: { minutes: 25, label: "Focus", color: "var(--coral)" },
  short: { minutes: 5, label: "Short break", color: "var(--sage)" },
  long: { minutes: 15, label: "Long break", color: "var(--sky)" },
} as const;
type Mode = keyof typeof MODES;

const timeEl = document.querySelector<HTMLDivElement>("#time")!;
const labelEl = document.querySelector<HTMLDivElement>("#label")!;
const ring = document.querySelector<SVGCircleElement>("#ring")!;
const startBtn = document.querySelector<HTMLButtonElement>("#start")!;
const sessionsEl = document.querySelector<HTMLDivElement>("#sessions")!;
const modeButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-mode]")];
const CIRCUMFERENCE = 2 * Math.PI * 88;

let mode: Mode = "focus";
let remaining = MODES.focus.minutes * 60;
let endsAt = 0;
let timer: number | undefined;
let completed = Number(sessionStorage.getItem("pomodoros") || 0);

function draw() {
  const total = MODES[mode].minutes * 60;
  const text = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  timeEl.textContent = text;
  labelEl.textContent = MODES[mode].label;
  document.title = `${text} · ${MODES[mode].label} — StudyMate AI`;
  ring.style.stroke = MODES[mode].color;
  ring.style.strokeDasharray = String(CIRCUMFERENCE);
  ring.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - remaining / total));
  sessionsEl.innerHTML = Array.from({ length: 4 }, (_, i) => `<span class="${i < completed % 4 ? "filled" : ""}"></span>`).join("");
}

function setMode(next: Mode) {
  stop();
  mode = next;
  remaining = MODES[mode].minutes * 60;
  modeButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
  draw();
}

function stop() {
  clearInterval(timer);
  timer = undefined;
  startBtn.textContent = "Start";
}

function chime() {
  try {
    const ctx = new AudioContext();
    [0, 0.25, 0.5].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.2);
    });
  } catch {}
}

function tick() {
  remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
  draw();
  if (remaining > 0) return;
  chime();
  if (mode === "focus") {
    completed++;
    sessionStorage.setItem("pomodoros", String(completed));
    setMode(completed % 4 === 0 ? "long" : "short");
  } else {
    setMode("focus");
  }
}

await initPage();

startBtn.addEventListener("click", () => {
  if (timer) return stop();
  endsAt = Date.now() + remaining * 1000;
  timer = window.setInterval(tick, 250);
  startBtn.textContent = "Pause";
});
document.querySelector("#reset")!.addEventListener("click", () => setMode(mode));
modeButtons.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode as Mode)));
draw();
