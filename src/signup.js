import { signUpFunction } from "./firebase.js";

// Toggle password visibility
const togglePasswordButtons = document.querySelectorAll('.toggle-password');
togglePasswordButtons.forEach(button => {
    button.addEventListener('click', function () {
        const input = this.parentElement.querySelector('input');
        const eyeIcon = this.querySelector('.eye-icon img');
        if (input.type === 'password') {
            input.type = 'text';
            eyeIcon.src = './public/Assets/show.png';
        } else {
            input.type = 'password';
            eyeIcon.src = './public/Assets/hide.png';
        }
    });
});

const signinLink = document.querySelector(".signin-link-text");
signinLink?.addEventListener("click", () => {
    window.location.href = "/signin.html";
});
// Password strength indicator
const passwordInput = document.getElementById('password');
const strengthBar = document.querySelector('.strength-fill');
const strengthText = document.querySelector('.strength-text');

passwordInput.addEventListener('input', function () {
    const password = this.value;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/\d/)) strength++;
    if (password.match(/[^a-zA-Z\d]/)) strength++;

    let strengthClass, strengthLabel, width;
    if (strength <= 1) {
        strengthClass = 'strength-weak';
        strengthLabel = 'Weak';
        width = '33%';
    } else if (strength === 2) {
        strengthClass = 'strength-medium';
        strengthLabel = 'Medium';
        width = '66%';
    } else {
        strengthClass = 'strength-strong';
        strengthLabel = 'Strong';
        width = '100%';
    }

    strengthBar.className = 'strength-fill ' + strengthClass;
    strengthBar.style.width = width;
    strengthText.textContent = 'Strength: ' + strengthLabel;
});

function isValidEmail(email) {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
}

// Form validation
const form = document.getElementById('signupForm');
form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const userName = document.getElementById('fullName').value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById('password').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();

    if (!isValidEmail(email)) return alert("Invalid Email Address");
    if (password !== confirmPassword) return alert('Passwords do not match!');
    if (password.length < 6) return alert("Password must be at least 6 characters.");

    try {
        await signUpFunction(userName, email, password); // ✅ await here
        alert("Account created successfully!");
        window.location.href = "./signin.html";
    } catch (error) {
        alert('Error creating account: ' + error.message);
    }
});
