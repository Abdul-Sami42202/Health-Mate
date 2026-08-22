import { setError } from "../utilities/errorMessage.js";
import { setupPasswordToggle } from "../utilities/passwordToggler.js";
import { auth, signInFunction } from "./firebase.js";
import { onAuthStateChanged } from "firebase/auth";


onAuthStateChanged(auth, (user) => {
  if (user) {
      window.location.replace("./dashboard.html");
  }
});

// =========================
// Elements
// =========================

const form = document.getElementById("signinForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const toggleBtn = document.querySelector(".password-toggle");


// =========================
// Email Validation
// =========================

function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

    return regex.test(email);
}


// =========================
// Password Visibility
// =========================

setupPasswordToggle(
    document.querySelector(".password-toggle"),
    document.getElementById("password")
);

setupPasswordToggle(
    document.querySelector(".confirm-password-toggle"),
    document.getElementById("confirmPassword")
);


// =========================
// Sign In Form
// =========================

form?.addEventListener("submit", async (e) => {

    // Stop the browser from reloading the page
    e.preventDefault();

    const email = (emailInput?.value || "").trim();
    const password = passwordInput?.value || "";

    // Clear previous error
    setError(form, "signin-error", "");


    // -------------------------
    // Basic Validation
    // -------------------------

    if (!email || !password) {
        setError(form, "signin-error", "Please enter both email and password.");
        return;
    }

    if (!isValidEmail(email)) {
        setError(form, "signin-error", "Please enter a valid email address.");
        return;
    }


    // -------------------------
    // Firebase Sign In
    // -------------------------

    try {

        await signInFunction(email, password);

        // Successful login

    } catch (err) {

        const code = err?.code || "";

        if (code === "auth/user-not-found") {

            setError(form, "signin-error", "Account not found. Please sign up first.");

        } else if (
            code === "auth/wrong-password" ||
            code === "auth/invalid-credential" ||
            code === "auth/invalid-email"
        ) {

            setError(form, "signin-error", "Incorrect email or password.");

        } else {

            setError(form, "signin-error", "Sign in failed. Please try again.");
        }
    }
});
