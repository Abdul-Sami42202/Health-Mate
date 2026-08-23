import { getFamilyMember, requireAuth, signOutFunction } from "../src/firebase";

// Load shared navbar
const navbarContainer = document.getElementById("navbar");

fetch("/utilities/navbar.html")
    .then(response => {
        if (!response.ok) {
            throw new Error("Navbar could not be loaded");
        }

        return response.text();
    })
    .then(data => {

        navbarContainer.innerHTML = data;

        setupNavbar();
        setupLogout();
        setActivePage();

        requireAuth(async (user) => {
            const sidebarAvatar = document.querySelector('.sidebar-avatar')
            const me = await getFamilyMember("you");
            sidebarAvatar.src = me?.image || "../public/Assets/user.png"
        });

    })
    .catch(error => {
        console.error("Navbar error:", error);
    });


function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");
  
    logoutBtn?.addEventListener("click", async event => {
      event.preventDefault();
  
      await signOutFunction();
      window.location.replace("./signin.html");
    });
  }
// =========================
// Navbar functionality
// =========================

function setupNavbar() {

    const hamburgerBtn = document.getElementById("hamburgerBtn");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");

    if (!hamburgerBtn || !sidebar || !overlay) return;


    function openSidebar() {

        sidebar.classList.add("open");
        overlay.classList.add("active");

        hamburgerBtn.setAttribute("aria-expanded", "true");

        document.body.style.overflow = "hidden";
    }


    function closeSidebar() {

        sidebar.classList.remove("open");
        overlay.classList.remove("active");

        hamburgerBtn.setAttribute("aria-expanded", "false");

        document.body.style.overflow = "";
    }


    hamburgerBtn.addEventListener("click", () => {

        const isOpen = sidebar.classList.contains("open");

        if (isOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }

    });


    overlay.addEventListener("click", closeSidebar);


    window.addEventListener("resize", () => {

        if (window.innerWidth >= 768) {
            closeSidebar();
        }

    });


    document.addEventListener("keydown", (e) => {

        if (e.key === "Escape") {
            closeSidebar();
        }

    });


    // Close sidebar after clicking a link on mobile
    document
        .querySelectorAll(".sidebar-nav a, .sidebar-footer a")
        .forEach(link => {

            link.addEventListener("click", () => {

                if (window.innerWidth < 768) {
                    closeSidebar();
                }

            });

        });


    // Language buttons
    const langButtons = document.querySelectorAll(".lang-btn");

    langButtons.forEach(button => {

        button.addEventListener("click", () => {

            langButtons.forEach(btn =>
                btn.classList.remove("active")
            );

            button.classList.add("active");

        });

    });

}


// =========================
// Active page
// =========================

function setActivePage() {

    const currentPage =
        window.location.pathname.split("/").pop() || "dashboard.html";

    const navLinks =
        document.querySelectorAll(".sidebar-nav a[data-page]");


    navLinks.forEach(link => {

        const href = link.getAttribute("href");

        if (href === currentPage) {

            link.classList.add("active");

            const icon =
                link.querySelector(".material-symbols-outlined");

            if (icon) {
                icon.classList.add("filled");
            }

        }

    });

}