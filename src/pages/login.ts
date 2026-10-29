import { AuthError, MissingIdentityError, getUser, login, requestPasswordRecovery, signup, updateUser } from "@netlify/identity";
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

function isUnconfirmed(error: unknown): boolean {
  return error instanceof AuthError && /not confirmed|confirm/i.test(error.message);
}

// Signing up again with an unconfirmed email makes Identity send a fresh confirmation link
function showResend(password: string) {
  showAlert("Your email isn't confirmed yet. Click the link we emailed you (check spam too), or get a new one:");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-sm";
  button.style.marginTop = "0.5rem";
  button.textContent = "Resend confirmation email";
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await signup(email.value.trim(), password);
      showAlert(`A new confirmation link was sent to ${email.value.trim()}. Open it on this device, then log in.`, "success");
    } catch (error) {
      showAlert(errorMessage(error));
    }
  });
  alertBox.firstElementChild!.append(document.createElement("br"), button);
}

function errorMessage(error: unknown): string {
  if (error instanceof MissingIdentityError) return "Login isn't available yet. Please try again shortly.";
  if (error instanceof AuthError) {
    // Browser-side errors carry GoTrue's message but no HTTP status, so match on the text
    if (isUnconfirmed(error)) return "Please confirm your email first — check your inbox for the link.";
    if (error.status === 401 || /invalid_grant|password invalid|no user found|invalid/i.test(error.message))
      return "Oops! Wrong email or password.";
    if (/fetch|network|timed out/i.test(error.message)) return "Can't reach the login service. Check your connection and try again.";
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
  const password = document.querySelector<HTMLInputElement>("#password")!.value;
  button.disabled = true;
  try {
    try {
      await login(email.value.trim(), password);
    } catch (error) {
      if (!isUnconfirmed(error)) throw error;
      // Older accounts still wait on an email link; confirm them server-side and retry once
      await fetch("/api/account/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.value.trim() }),
      });
      await login(email.value.trim(), password);
    }
    location.href = next;
  } catch (error) {
    if (isUnconfirmed(error)) showResend(password);
    else showAlert(errorMessage(error));
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
