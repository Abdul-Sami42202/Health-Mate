import { onAuthStateChanged } from "firebase/auth";
import { auth, signUpFunction } from "./firebase.js";
import { setError } from "../utilities/errorMessage.js";
import { setupPasswordToggle } from "../utilities/passwordToggler.js";
import { showLoader, hideLoader } from "../utilities/loader";

// onAuthStateChanged(auth, (user) => {
//     if (user) {
//         window.location.replace("./dashboard.html");
//     }
// });

function isValidEmail(email) {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
}

setupPasswordToggle(
    document.querySelector(".password-toggle"),
    document.getElementById("password")
);

setupPasswordToggle(
    document.querySelector(".confirm-password-toggle"),
    document.getElementById("confirmPassword")
);

// Form validation
const form = document.getElementById('signupForm');
form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const userName = document.getElementById('fullName').value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!isValidEmail(email)) {
        return setError(form, "signup-error", "Invalid Email Address");
    }
    if (password !== confirmPassword) {
        return setError(form, "signup-error", 'Passwords do not match!');
    }
    if (password.length < 8) {
        return setError(form, "signup-error", "Password must be at least 8 characters.");
    }

    showLoader();
    try {
        await signUpFunction(userName, email, password); // ✅ await here
        alert("Account created successfully!");
        window.location.replace("./dashboard.html");
    } catch (error) {
        const code = error?.code || "";

        if (code === "auth/email-already-in-use") {
            setError(form, "signup-error", "An account with this email already exists.");
        } else if (code === "auth/invalid-email") {
            setError(form, "signup-error", "Please enter a valid email address.");
        } else if (code === "auth/weak-password") {
            setError(form, "signup-error", "Password is too weak. Use at least 8 characters.");
        } else {
            setError(form, "signup-error", "Account creation failed. Please try again.");
        }
    } finally {
        hideLoader();
    }
});
