import {
    requireAuth,
    getFamilyMember,
    updateFamilyMember,
    getCurrentUserName,
    signOutFunction
} from "../src/firebase";
import { uploadToCloudinary } from "./cloudinary";
import { showLoader, hideLoader } from "../utilities/loader";

document.querySelectorAll('input[name="language"]').forEach(input => {
    input.addEventListener("change", () => {
        document.querySelectorAll(".language-option").forEach(option => {
            option.classList.remove("selected");
        });

        input.closest(".language-option").classList.add("selected");
    });
});

// Get which member to show from the URL, default to "you"
const params = new URLSearchParams(window.location.search);
const memberId = params.get("id") || "you";

// Page elements
const avatarImg = document.querySelector(".profile-avatar-large img");
const nameEl = document.querySelector(".profile-name h2");
const patientIdEl = document.querySelector(".personal-card p");

const emailEl = document.querySelector('.detail-value[data-field="email"]');
const phoneEl = document.querySelector('.detail-value[data-field="phone"]');
const dobEl = document.querySelector('.detail-value[data-field="dob"]');
const bloodGroupEl = document.querySelector('.detail-value[data-field="bloodGroup"]');

const emergencyNameEl = document.querySelector(".contact-name");
const emergencyRelationEl = document.querySelector(".contact-relation");
const emergencyPhoneLink = document.querySelector(".phone-link");

const editProfileBtn = document.querySelector(".edit-profile-btn");

// Modal elements (same IDs as family.html)
const modal = document.getElementById("familyModal");
const closeModal = document.getElementById("closeModal");
const cancelBtn = document.getElementById("cancelBtn");
const familyForm = document.getElementById("familyForm");
const modalTitle = document.querySelector(".modal-header h2");
const submitBtn = document.querySelector(".save-btn");
const logoutBtn = document.querySelector(".logout-main-btn");

const nameInput = document.querySelector("#memberName");
const emailInput = document.querySelector("#email");
const relationInput = document.querySelector("#memberRelation");
const ageInput = document.getElementById("memberAge");
const genderInput = document.getElementById("memberGender");
const imageInput = document.getElementById("memberImage");
const bloodGroupInput = document.getElementById("bloodGroup");
const emergencyContactInput = document.getElementById("emergencyContact");
const emergencyPhoneInput = document.getElementById("emergencyPhone");
const RWECInput = document.getElementById("relationWithEmergencyContact");
const phoneInput = document.getElementById("phone");
const DOBInput = document.getElementById("dateOfBirth");

let currentMember = null;

requireAuth(async (user) => {
    await loadProfile();
});

async function loadProfile() {
    showLoader();
    try {
        const member = await getFamilyMember(memberId);

        if (!member) {
            alert("This profile could not be found.");
            window.location.href = "family.html";
            return;
        }

        currentMember = member;
        renderProfile(member);

    } catch (error) {
        console.error("Failed to load profile:", error);
    } finally {
        hideLoader();
    }
}

function renderProfile(member) {
    const isSelf = member.id === "you";

    nameEl.textContent = member.memberName || "Unnamed";
    patientIdEl.textContent = `Patient ID: #${member.id}`;

    // ✅ Avatar: image if present, otherwise first-letter fallback
    const avatarContainer = document.querySelector(".profile-avatar-large");
    const initial = (member.memberName || "?").charAt(0).toUpperCase();

    if (member.image) {
        avatarContainer.innerHTML = `<img src="${member.image}" alt="${escapeHTML(member.memberName || "User")} profile picture">`;
    } else {
        avatarContainer.innerHTML = `<span class="avatar-initial">${escapeHTML(initial)}</span>`;
    }

    emailEl.innerHTML = `<span class="material-symbols-outlined">mail</span> ${escapeHTML(member.email || "Not provided")}`;
    phoneEl.innerHTML = `<span class="material-symbols-outlined">call</span> ${escapeHTML(member.phone || "Not provided")}`;
    dobEl.innerHTML = `<span class="material-symbols-outlined">cake</span> ${escapeHTML(member.dob || "Not provided")}`;
    bloodGroupEl.innerHTML = `<span class="material-symbols-outlined">bloodtype</span> ${escapeHTML(member.bloodGroup || "Not provided")}`;

    emergencyNameEl.textContent = member.emergencyContact || "Not set";
    emergencyRelationEl.textContent = member.relationWithEmergencyContact || "";

    if (member.emergencyPhone) {
        emergencyPhoneLink.href = `tel:${member.emergencyPhone}`;
        emergencyPhoneLink.querySelector("span").innerHTML =
            `<span class="material-symbols-outlined">phone</span> ${escapeHTML(member.emergencyPhone)}`;
    }
}

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// =========================
// EDIT PROFILE → open modal, pre-filled
// =========================

editProfileBtn?.addEventListener("click", () => {
    if (!currentMember) return;

    console.log({
        modal, closeModal, cancelBtn, familyForm, modalTitle, submitBtn,
        nameInput, emailInput, relationInput, ageInput, genderInput, imageInput,
        bloodGroupInput, emergencyContactInput, emergencyPhoneInput, RWECInput,
        phoneInput, DOBInput
    });

    nameInput.value = currentMember.memberName || "";
    relationInput.value = currentMember.relation || "";
    DOBInput.value = currentMember.dob || "";
    phoneInput.value = currentMember.phone || "";
    bloodGroupInput.value = currentMember.bloodGroup || "";
    ageInput.value = currentMember.age || "";
    genderInput.value = currentMember.gender || "";
    emailInput.value = currentMember.email || "";
    emergencyContactInput.value = currentMember.emergencyContact || "";
    emergencyPhoneInput.value = currentMember.emergencyPhone || "";
    RWECInput.value = currentMember.relationWithEmergencyContact || "";

    const isSelf = currentMember.id === "you";

    if (isSelf) {
        relationInput.setAttribute("disabled", "");
        relationInput.classList.add("locked-field");
    } else {
        relationInput.removeAttribute("disabled");
        relationInput.classList.remove("locked-field");
    }

    modalTitle.textContent = "Edit Profile";
    submitBtn.innerHTML = `<span class="material-symbols-outlined">save</span> Save Changes`;

    openModal();
});

function openModal() {
    modal.classList.add("active");
    modal.removeAttribute("inert");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    nameInput.focus();
}

function closeModalFn() {
    if (modal.contains(document.activeElement)) {
        document.activeElement.blur();
    }
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    modal.setAttribute("inert", "");
    document.body.style.overflow = "";
    familyForm.reset();
}

closeModal?.addEventListener("click", closeModalFn);
cancelBtn?.addEventListener("click", closeModalFn);

modal?.addEventListener("click", (event) => {
    if (event.target === modal) closeModalFn();
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("active")) {
        closeModalFn();
    }
});

logoutBtn?.addEventListener('click', async event => {
  event.preventDefault();
  await signOutFunction();
  window.location.replace("./signin.html");
});


// =========================
// SAVE CHANGES
// =========================

familyForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    const isSelf = currentMember.id === "you";

    const name = nameInput.value.trim();
    const relation = isSelf ? "Self" : relationInput.value.trim();
    const dob = DOBInput.value;
    const phoneVal = phoneInput.value.trim();
    const bloodGroupVal = bloodGroupInput.value;
    const emergencyContactVal = emergencyContactInput.value.trim();
    const emergencyPhoneVal = emergencyPhoneInput.value.trim();
    const RWECVal = RWECInput.value.trim();
    const ageVal = ageInput.value.trim();
    const genderVal = genderInput.value;
    const emailVal = emailInput.value.trim();
    const file = imageInput.files[0];

    async function save(image) {
        try {
            let imageUrl = image || currentMember.image || null;

            if (file) {
                imageUrl = await uploadToCloudinary(file);
            }

            const fields = {
                memberName: name,
                relation,
                image: imageUrl,
                dob,
                phone: phoneVal,
                bloodGroup: bloodGroupVal,
                age: ageVal,
                gender: genderVal,
                email: emailVal,
                emergencyContact: emergencyContactVal,
                emergencyPhone: emergencyPhoneVal,
                relationWithEmergencyContact: RWECVal
            };

            await updateFamilyMember(currentMember.id, fields);

            currentMember = { ...currentMember, ...fields };
            renderProfile(currentMember);

            closeModalFn();

        } catch (error) {
            console.error("Failed to update profile:", error);
            alert("Something went wrong saving changes. Please try again.");
        }
    }

    save(null);
});
