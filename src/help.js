import { requireAuth, submitSupportRequest } from "./firebase";

requireAuth();

const supportForm = document.getElementById("supportForm");
const supportSubmitBtn = document.getElementById("supportSubmitBtn");
const supportSuccess = document.getElementById("supportSuccess");

supportForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("supportEmail").value.trim();
    const subject = document.getElementById("supportSubject").value.trim();
    const message = document.getElementById("supportMessage").value.trim();

    if (!email || !subject || !message) return;

    supportSubmitBtn.disabled = true;
    const originalText = supportSubmitBtn.innerHTML;
    supportSubmitBtn.innerHTML = `<span class="material-symbols-outlined">hourglass_top</span> Sending...`;

    try {
        await submitSupportRequest({ email, subject, message });

        supportForm.reset();
        supportSuccess.classList.add("visible");

        setTimeout(() => {
            supportSuccess.classList.remove("visible");
        }, 4000);

    } catch (error) {
        console.error("Failed to submit support request:", error);
        alert("Something went wrong sending your message. Please try again.");
    } finally {
        supportSubmitBtn.disabled = false;
        supportSubmitBtn.innerHTML = originalText;
    }
});