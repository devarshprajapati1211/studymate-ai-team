import { AuthError, MissingIdentityError, signup } from "@netlify/identity";
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
    const user = await signup(value("#email"), document.querySelector<HTMLInputElement>("#password")!.value, {
      full_name: value("#name"),
    });
    if (user.confirmedAt) {
      location.href = "/dashboard";
      return;
    }
    form.hidden = true;
    showAlert("Registration successful! Check your email and click the confirmation link to log in.", "success");
  } catch (error) {
    if (error instanceof MissingIdentityError) showAlert("Sign-up isn't available yet. Please try again shortly.");
    else if (error instanceof AuthError && error.status === 400) showAlert("This email is already registered.");
    else if (error instanceof AuthError && error.status === 403) showAlert("Sign-ups are currently closed.");
    else if (error instanceof AuthError) showAlert(error.message);
    else showAlert("Something went wrong. Please try again.");
    button.disabled = false;
  }
});
