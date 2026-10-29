import { resolve } from "node:path";
import { defineConfig } from "vite";

const pages = ["index", "login", "register", "dashboard", "chatbot", "notes", "todo", "quiz", "flashcards", "pomodoro"];

export default defineConfig({
  build: {
    rolldownOptions: {
      input: Object.fromEntries(pages.map((p) => [p, resolve(import.meta.dirname, `${p}.html`)])),
    },
  },
});
