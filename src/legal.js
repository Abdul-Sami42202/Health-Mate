const tabs = document.querySelectorAll(".legal-tab");
const sections = document.querySelectorAll(".legal-card");

function showSection(target) {
    tabs.forEach(tab => {
        const isActive = tab.dataset.target === target;
        tab.classList.toggle("active", isActive);
        tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    sections.forEach(section => {
        section.classList.toggle("active", section.id === target);
    });
}

tabs.forEach(tab => {
    tab.addEventListener("click", () => {
        const target = tab.dataset.target;
        showSection(target);
        history.replaceState(null, "", `#${target}`);
    });
});

// On load, respect the URL hash if present (e.g. footer links to legal.html#privacy)
const initialTarget = window.location.hash.replace("#", "") || "disclaimer";
const validTargets = ["disclaimer", "privacy", "terms"];
showSection(validTargets.includes(initialTarget) ? initialTarget : "disclaimer");