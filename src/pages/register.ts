import { AuthError, MissingIdentityError, login } from "@netlify/identity";
import { initPage } from "../app";

const alertBox = document.querySelector<HTMLDivElement>("#alert")!;
const form = document.querySelector<HTMLFormElement>("#register-form")!;

function showAlert(message: string, kind: "error" | "success" = "error") {
  alertBox.innerHTML = "";
  const div = document.createElement("div");
  div.className = `alert alert-${kind}`;
  div.textContent = message;
  alertBox.append(div);
}

if (await initPage()) location.replace("/dashboard");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const button = form.querySelector<HTMLButtonElement>("button[type=submit]")!;
  const value = (id: string) => document.querySelector<HTMLInputElement>(id)!.value.trim();
  button.disabled = true;
  try {
    const password = document.querySelector<HTMLInputElement>("#password")!.value;
    // Accounts are created server-side already confirmed, so the student is logged in right away
    const res = await fetch("/api/account/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: value("#name"), email: value("#email"), password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showAlert(data.error || "Something went wrong. Please try again.");
      button.disabled = false;
      return;
    }
    await login(value("#email"), password);
    location.href = "/dashboard";
  } catch (error) {
    // Browser-side errors carry GoTrue's message but no HTTP status, so match on the text
    const msg = error instanceof AuthError ? error.message : "";
    if (error instanceof MissingIdentityError) showAlert("Sign-up isn't available yet. Please try again shortly.");
    else if (/already (been )?registered|already exists/i.test(msg))
      showAlert("This email is already registered. Try logging in instead.");
    else if (error instanceof AuthError && (error.status === 403 || /not allowed|signups? (are )?disabled/i.test(msg)))
      showAlert("Sign-ups are currently closed.");
    else if (/password/i.test(msg)) showAlert("Please choose a stronger password (at least 8 characters).");
    else if (/email/i.test(msg)) showAlert("Please enter a valid email address.");
    else if (/fetch|network|timed out/i.test(msg)) showAlert("Can't reach the sign-up service. Check your connection and try again.");
    else if (error instanceof AuthError) showAlert(msg);
    else showAlert("Something went wrong. Please try again.");
    button.disabled = false;
  }
});
