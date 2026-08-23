// Self-injecting global loader — import once per page, call showLoader()/hideLoader() anywhere.

let overlay = null;

function ensureLoaderExists() {
    if (overlay) return;

    overlay = document.createElement("div");
    overlay.className = "global-loader";
    overlay.id = "globalLoader";
    overlay.innerHTML = `<div class="global-loader-spinner"></div>`;
    document.body.appendChild(overlay);
}

export function showLoader() {
    ensureLoaderExists();
    overlay.classList.add("active");
}

export function hideLoader() {
    if (!overlay) return;
    overlay.classList.remove("active");
}