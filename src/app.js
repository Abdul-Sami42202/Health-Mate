// Mobile menu toggle
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const nav = document.querySelector('.nav');
const headerActions = document.querySelector('.header-actions');
const navLinks = document.querySelectorAll('.nav-link');

function closeMobileNav() {
    nav.classList.remove('active');
    mobileMenuToggle.classList.remove('active');
    headerActions.classList.remove('active');
}

mobileMenuToggle.addEventListener('click', () => {
    nav.classList.toggle('active');
    mobileMenuToggle.classList.toggle('active');

    // headerActions are only used on desktop now; keep classes in sync
    if (window.innerWidth > 990) {
        headerActions.classList.toggle('active');
    }
});

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 990) {
            closeMobileNav();
        }
    });
});

window.addEventListener('resize', () => {
    if (window.innerWidth > 990) {
        closeMobileNav();
    }
});

const CreateAccountBtn = document.querySelectorAll('.Sign-up-page')
CreateAccountBtn.forEach((btn) => {
    btn.addEventListener('click', () => {

        window.location.href = "./signup.html"
    })
});
// app.js (home page)
const signInBtns = document.querySelectorAll(".sign-in-btn"); // your actual class
signInBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        window.location.href = "./signin.html";
    });
});