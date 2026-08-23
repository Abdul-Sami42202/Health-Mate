// =========================
// SIGN UP / SIGN IN (desktop + mobile)
// =========================

const signUpBtns = document.querySelectorAll('.sign-up, .mobile-sign-up');
signUpBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
        window.location.href = "./signup.html";
    });
});

const signInBtns = document.querySelectorAll(".sign-in, .mobile-sign-in");
signInBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        window.location.href = "./signin.html";
    });
});


const joinBtn = document.querySelector('.join-button')

joinBtn.addEventListener('click', () => {
    window.location.href = "./signup.html";
});

const aiButton = document.querySelector('.ai-button');
aiButton?.addEventListener('click', () => {
    window.location.href = "./signup.html";
});

// =========================
// MOBILE MENU TOGGLE
// =========================

const mobileMenuButton = document.getElementById("mobileMenuButton");
const mobileNav = document.getElementById("mobileNav");

mobileMenuButton?.addEventListener("click", () => {
    mobileNav.classList.toggle("open");

    const isOpen = mobileNav.classList.contains("open");
    mobileMenuButton.setAttribute("aria-expanded", isOpen ? "true" : "false");

    const icon = mobileMenuButton.querySelector(".material-symbols-outlined");
    icon.textContent = isOpen ? "close" : "menu";
});

// Close menu after clicking any link/button inside it
mobileNav.querySelectorAll("a, button").forEach(el => {
    el.addEventListener("click", () => {
        mobileNav.classList.remove("open");
        mobileMenuButton.setAttribute("aria-expanded", "false");
        mobileMenuButton.querySelector(".material-symbols-outlined").textContent = "menu";
    });
});

// Close if window is resized back to desktop width
window.addEventListener("resize", () => {
    if (window.innerWidth > 840 && mobileNav.classList.contains("open")) {
        mobileNav.classList.remove("open");
        mobileMenuButton.setAttribute("aria-expanded", "false");
        mobileMenuButton.querySelector(".material-symbols-outlined").textContent = "menu";
    }
});


// =========================
// DEMO VIDEO MODAL
// =========================

const seeDemoBtn = document.getElementById("seeDemoBtn");
const videoModal = document.getElementById("videoModal");
const videoModalBackdrop = document.getElementById("videoModalBackdrop");
const videoModalClose = document.getElementById("videoModalClose");
const demoVideo = document.getElementById("demoVideo");

function openVideoModal() {
    videoModal.classList.add("active");
    videoModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function closeVideoModal() {
    videoModal.classList.remove("active");
    videoModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    demoVideo.pause();
    demoVideo.currentTime = 0;
}

seeDemoBtn?.addEventListener("click", openVideoModal);
videoModalBackdrop?.addEventListener("click", closeVideoModal);
videoModalClose?.addEventListener("click", closeVideoModal);

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && videoModal.classList.contains("active")) {
        closeVideoModal();
    }
});