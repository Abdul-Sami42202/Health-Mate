export function getErrorBox(form, id) {
    if (!form) return null;

    let box = document.getElementById(id);

    if (!box) {
        box = document.createElement("div");

        box.id = id;
        box.style.display = "none";
        box.style.marginBottom = "12px";
        box.style.padding = "10px 12px";
        box.style.borderRadius = "10px";
        box.style.background = "rgba(231, 70, 148, 0.06)";
        box.style.border = "1px solid rgba(231, 70, 148, 0.2)";
        box.style.color = "#A81D5F";
        box.style.fontSize = "13px";

        form.insertAdjacentElement("afterbegin", box);
    }

    return box;
}

export function setError(form, id, message) {
    const box = getErrorBox(form, id);

    if (!box) return;

    if (!message) {
        box.style.display = "none";
        box.textContent = "";
    } else {
        box.style.display = "block";
        box.textContent = message;

        box.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}