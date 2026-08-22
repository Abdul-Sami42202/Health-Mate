export function setupPasswordToggle(button, input) {
    if (!button || !input) return;

    button.addEventListener("click", () => {
        const icon = button.querySelector(".material-symbols-outlined");

        if (input.type === "password") {
            input.type = "text";
            icon.textContent = "visibility";
        } else {
            input.type = "password";
            icon.textContent = "visibility_off";
        }
    });
}