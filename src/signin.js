import { signInFunction } from "./firebase.js";

// Elements
const form = document.getElementById("signinForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const toggleBtn = document.querySelector(".toggle-password");

// Simple helper to show one error box inside the form
function getErrorBox() {
  if (!form) return null;
  let box = document.getElementById("signin-error");
  if (!box) {
    box = document.createElement("div");
    box.id = "signin-error";
    box.style.display = "none";
    box.style.marginBottom = "12px";
    box.style.padding = "10px 12px";
    box.style.borderRadius = "10px";
    box.style.background = "rgba(231, 70, 148, 0.06)";
    box.style.border = "1px solid rgba(231, 70, 148, 0.2)";
    box.style.color = "#A81D5F";
    box.style.fontSize = "13px";
    form.insertAdjacentElement("afterbegin", box);
  }
  return box;
}

function setError(message) {
  const box = getErrorBox();
  if (!box) return;
  if (!message) {
    box.style.display = "none";
    box.textContent = "";
  } else {
    box.style.display = "block";
    box.textContent = message;
  }
}

// Very simple email regex
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

// Toggle password visibility (keep existing behavior)
if (toggleBtn && passwordInput) {
  toggleBtn.addEventListener("click", function () {
    const eyeIcon = this.querySelector(".eye-icon img");
    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      if (eyeIcon) eyeIcon.src = "./public/Assets/show.png";
    } else {
      passwordInput.type = "password";
      if (eyeIcon) eyeIcon.src = "./public/Assets/hide.png";
    }
  });
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = (emailInput?.value || "").trim();
  const password = passwordInput?.value || "";

  // Clear previous error
  setError("");

  // 1) Basic client-side checks
  if (!email || !password) {
    setError("Please enter both email and password.");
    return;
  }

  if (!isValidEmail(email)) {
    setError("Please enter a valid email address.");
    return;
  }

  // 2) Firebase sign-in + simple error mapping
  try {
    await signInFunction(email, password);
    window.location.href = "./dashboard.html";
  } catch (err) {
    const code = err?.code || "";

    if (code === "auth/user-not-found") {
      setError("Account not found. Please sign up first.");
    } else if (
      code === "auth/wrong-password" ||
      code === "auth/invalid-credential" ||
      code === "auth/invalid-email"
    ) {
      setError("Incorrect email or password.");
    } else {
      setError("Sign in failed. Please try again.");
    }
  }
});