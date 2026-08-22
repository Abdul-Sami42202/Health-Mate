const CreateAccountBtn = document.querySelectorAll('.sign-up')
CreateAccountBtn.forEach((btn) => {
    btn.addEventListener('click', () => {

        window.location.href = "./signup.html"
    })
});
// app.js (home page)
const signInBtns = document.querySelectorAll(".sign-in"); // your actual class
signInBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        window.location.href = "./signin.html";
    });
});