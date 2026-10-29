import { AuthError, MissingIdentityError, getUser, login, requestPasswordRecovery, updateUser } from "@netlify/identity";
import { initPage, toast } from "../app";

const params = new URLSearchParams(location.search);
const next = params.get("next")?.startsWith("/") ? params.get("next")! : "/dashboard";
const alertBox = document.querySelector<HTMLDivElement>("#alert")!;
const loginForm = document.querySelector<HTMLFormElement>("#login-form")!;
const resetForm = document.querySelector<HTMLFormElement>("#reset-form")!;
const email = document.querySelector<HTMLInputElement>("#email")!;

function showAlert(message: string, kind: "error" | "success" = "error") {
  alertBox.innerHTML = "";
  const div = document.createElement("div");
  div.className = `alert alert-${kind}`;
  div.textContent = message;
  alertBox.append(div);
}

function errorMessage(error: unknown): string {
  if (error instanceof MissingIdentityError) return "Login isn't available yet. Please try again shortly.";
  if (error instanceof AuthError) {
    if (error.status === 401 || error.status === 400) return "Oops! Wrong email or password.";
    if (/confirm/i.test(error.message)) return "Please confirm your email first — check your inbox.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

await initPage();

if (params.get("reset") === "1" && (await getUser())) {
  document.querySelector("#title")!.textContent = "Set a new password";
  loginForm.hidden = true;
  resetForm.hidden = false;
} else if (await getUser()) {
  location.replace(next);
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const button = loginForm.querySelector<HTMLButtonElement>("button[type=submit]")!;
  button.disabled = true;
  try {
    await login(email.value.trim(), document.querySelector<HTMLInputElement>("#password")!.value);
    location.href = next;
  } catch (error) {
    showAlert(errorMessage(error));
    button.disabled = false;
  }
});

document.querySelector("#forgot")!.addEventListener("click", async () => {
  if (!email.value.trim()) {
    showAlert("Enter your email above, then click “Forgot password?” again.");
    email.focus();
    return;
  }
  try {
    await requestPasswordRecovery(email.value.trim());
    showAlert("If that account exists, a password reset link is on its way to your inbox.", "success");
  } catch (error) {
    showAlert(errorMessage(error));
  }
});

resetForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await updateUser({ password: document.querySelector<HTMLInputElement>("#new-password")!.value });
    toast("Password updated.", "success");
    location.href = "/dashboard";
  } catch (error) {
    showAlert(errorMessage(error));
  }
});
