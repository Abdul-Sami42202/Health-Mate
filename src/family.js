import { familyMembersData, deleteFamilyMember, loadFamilyMembers, ensureYouCardExists, updateFamilyMember, requireAuth, loadReports, loadVitals } from "./firebase";
import { uploadToCloudinary } from "./cloudinary";

const addMemberBtn = document.getElementById("addMemberBtn");
const mobileAddMemberBtn = document.getElementById("mobileAddMemberBtn");

const modal = document.getElementById("familyModal");
const closeModal = document.getElementById("closeModal");
const cancelBtn = document.getElementById("cancelBtn");

const openBtn = document.querySelectorAll(".family-card-add");
const closeBtn = document.getElementById("closeModal");
const modalTitle = document.querySelector(".modal-header h2");
const submitBtn = document.querySelector(".save-btn");

const nameInput = document.querySelector("#memberName")
const email = document.querySelector("#email")
const relationInput = document.querySelector("#memberRelation");
const age = document.getElementById("memberAge")
const memberGender = document.getElementById("memberGender")
const memberImage = document.getElementById("memberImage")
const bloodGroup = document.getElementById("bloodGroup")
const emergencyContact = document.getElementById("emergencyContact")
const emergencyPhone = document.getElementById("emergencyPhone")
const RWEC = document.getElementById("relationWithEmergencyContact")
const phone = document.getElementById("phone")
const DOB = document.getElementById("dateOfBirth")
let reports;
let lastVital;

const familyForm = document.getElementById("familyForm");
const familyGrid = document.getElementById("familyGrid");
const familyCards = document.querySelectorAll(".family-card")

const familyMembersMap = new Map();
let editingMemberId = null;

requireAuth(async (user) => {
    const { isNew, data } = await ensureYouCardExists(user);

    await renderFamilyMembers(); // this will now include the "you" doc automatically

    if (isNew) {
        openSelfSetupModal(data); // prompt them to fill in the rest (DOB, phone, blood group, etc.)
    }
});

function openSelfSetupModal(data) {
    setAddMode();                       // reset form, but we override right after
    editingMemberId = "you";            // tells submit handler: update, don't create

    nameInput.value = data.memberName || "";
    relationInput.value = "Self (Apna)";
    email.value = data.email || "";

    // Lock name/relation/email — pre-filled from account creation, not editable here
    relationInput.setAttribute("disabled", "");
    relationInput.classList.add("locked-field");

    modalTitle.textContent = "Complete Your Profile";
    submitBtn.innerHTML = `
        <span class="material-symbols-outlined">save</span>
        Save Profile
    `;

    openFamilyModal();
}

function setAddMode() {
    editingMemberId = null;
    familyForm.reset();

    relationInput.removeAttribute("disabled");        //  unlock
    relationInput.classList.remove("locked-field");    //  unlock

    modalTitle.textContent = "Add Family Member";
    submitBtn.innerHTML = `
        <span class="material-symbols-outlined">person_add</span>
        Add Member
    `;
}

async function renderFamilyMembers() {
    try {
        const docs = await loadFamilyMembers();

        // ✅ fetch once, reuse for the "you" card only (real data source right now)
        const [reports, vitals] = await Promise.all([loadReports(), loadVitals()]);
        const reportsCount = reports.length;
        const latestVital = vitals[0]; // loadVitals() already returns newest-first
        const lastVitalText = latestVital
            ? `${latestVital.type}: ${latestVital.value}`
            : null;

        docs.forEach(docSnap => {
            const data = docSnap.data();

            const isSelf = docSnap.id === "you";

            const member = {
                id: docSnap.id,
                name: data.memberName || "",
                relation: data.relation || "",
                image: data.image || null,
                dob: data.dob || "",
                phone: data.phone || "",
                bloodGroup: data.bloodGroup || "",
                age: data.age || "",
                gender: data.gender || "",
                email: data.email || "",
                emergencyContact: data.emergencyContact || "",
                emergencyPhone: data.emergencyPhone || "",
                relationWithEmergencyContact: data.relationWithEmergencyContact || "",
                reports: isSelf ? reportsCount : 0,           // ✅ real count for self
                lastVital: isSelf ? lastVitalText : null       // ✅ real value for self
            };

            familyMembersMap.set(member.id, member);
            createFamilyCard(member);
        });

    } catch (error) {
        console.error("Failed to load family members:", error);
    }
}

// =========================
// Edit form
// =========================

familyGrid.addEventListener("click", event => {
    const editBtn = event.target.closest(".edit-btn");

    if (!editBtn) return;

    const card = editBtn.closest(".family-card");

    if (!card) return;

    const memberId = card.dataset.id;
    const member = familyMembersMap.get(memberId);

    if (!member) {
        console.error("Member data not found:", memberId);
        return;
    }

    // Remember which member is being edited
    editingMemberId = memberId;

    // Fill the form
    nameInput.value = member.name;
    relationInput.value = member.relation;
    DOB.value = member.dob;
    phone.value = member.phone;
    bloodGroup.value = member.bloodGroup;
    age.value = member.age;
    memberGender.value = member.gender;
    email.value = member.email;
    emergencyContact.value = member.emergencyContact;
    emergencyPhone.value = member.emergencyPhone;
    RWEC.value = member.relationWithEmergencyContact;

    if (memberId === "you") {
        relationInput.setAttribute("disabled", "");   //  lock again if editing "you"
        relationInput.classList.add("locked-field");
    } else {
        relationInput.removeAttribute("disabled");     //  stay unlocked otherwise
        relationInput.classList.remove("locked-field");
    }

    modalTitle.textContent = "Edit Family Member";
    submitBtn.innerHTML = `
    <span class="material-symbols-outlined">save</span>
    Save Changes`;

    openFamilyModal();
});


// =========================
// DELETE MEMBER
// =========================



// =========================
// OPEN MODAL
// =========================

let modalTrigger = null;

function openFamilyModal(event) {
    modalTrigger = event?.currentTarget || document.activeElement;

    modal.classList.add("active");
    modal.removeAttribute("inert");
    modal.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";
    nameInput.focus();
}

function openAddMemberModal() {
    setAddMode();
    openFamilyModal();
}
// =========================
// CLOSE MODAL
// =========================

function closeFamilyModal() {
    if (modal.contains(document.activeElement)) {
        document.activeElement.blur();
    }

    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    modal.setAttribute("inert", "");

    document.body.style.overflow = "";
    familyForm.reset();

    modalTrigger?.focus();
}

// =========================
// OPEN BUTTONS
// =========================

addMemberBtn?.addEventListener(
    "click",
    openAddMemberModal
);

mobileAddMemberBtn?.addEventListener(
    "click",
    openAddMemberModal
);


// =========================
// CLOSE BUTTONS
// =========================

closeModal?.addEventListener(
    "click",
    closeFamilyModal
);

cancelBtn?.addEventListener(
    "click",
    closeFamilyModal
);


// =========================
// CLOSE WHEN CLICKING OUTSIDE
// =========================

modal.addEventListener("click", (event) => {

    if (event.target === modal) {
        closeFamilyModal();
    }

});


// =========================
// ESCAPE KEY
// =========================

document.addEventListener("keydown", (event) => {

    if (
        event.key === "Escape" &&
        modal.classList.contains("active")
    ) {
        closeFamilyModal();
    }

});

// =========================
// FORM SUBMIT
// =========================

familyForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const relation = editingMemberId === "you" ? "Self (Apna)" : relationInput.value.trim(); // relation locked for self
    const dob = DOB.value;
    const phoneVal = phone.value.trim();
    const bloodGroupVal = bloodGroup.value;
    const emergencyContactVal = emergencyContact.value.trim();
    const emergencyPhoneVal = emergencyPhone.value.trim();
    const RWECVal = RWEC.value.trim();
    const ageVal = age.value.trim();
    const genderVal = memberGender.value;
    const emailVal = email.value.trim();
    const file = memberImage.files[0];

    async function buildCard(image) {
        try {
            let imageUrl = image;

            if (file) {
                imageUrl = await uploadToCloudinary(file);
            }

            const fields = {
                name,
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

            if (editingMemberId) {
                // ✅ UPDATE existing doc (covers both "you" and normal edits)
                await updateFamilyMember(editingMemberId, {
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
                });

                const existing = familyMembersMap.get(editingMemberId) || {};
                const updatedMember = { ...existing, id: editingMemberId, ...fields, reports: existing.reports || 0, lastVital: existing.lastVital || null };

                familyMembersMap.set(editingMemberId, updatedMember);

                // Replace the old card in the DOM with the updated one
                const oldCard = familyGrid.querySelector(`[data-id="${editingMemberId}"]`);
                oldCard?.remove();
                createFamilyCard(updatedMember);

            } else {
                // ✅ CREATE new member
                const newId = await familyMembersData(fields);
                const newMember = { id: newId, ...fields, reports: 0, lastVital: null };

                familyMembersMap.set(newId, newMember);
                createFamilyCard(newMember);
            }

            closeFamilyModal();

        } catch (error) {
            console.error("Failed to save family member:", error);
            alert("Something went wrong saving this member. Please try again.");
        }
    }

    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => buildCard(e.target.result);
        reader.readAsDataURL(file);
    } else {
        buildCard(null);
    }
});

// =========================
// CREATE FAMILY CARD
// =========================

function createFamilyCard({
    id,
    name,
    relation,
    image,
    reports,
    lastVital,
    dob,
    phone,
    bloodGroup,
    emergencyContact,
    emergencyPhone 
    }) {

    const card = document.createElement("article");

    card.className = "family-card";
    card.dataset.id = id;

    const isSelf = id === "you"; // matches what you set in ensureYouCardExists
    const displayRelation = isSelf ? "Self (Apna)" : relation;


    // First letter of name
    const initial =
        name.charAt(0).toUpperCase();


    card.innerHTML = `

        <div class="family-card-header">



            <div class="avatar">
                    ${
                        image 
                            ? `<img src="${image}" alt="${escapeHTML(name)}" />` 
                            : initial
                    }
            </div>

            <div class="family-card-info">

                <h3>
                    ${escapeHTML(name)}
                </h3>

                <p>
                    ${escapeHTML(displayRelation)}
                </p>

            </div>
                    ${
            isSelf
                ? `<div class="primary-badge">Primary</div>`
                : ""
        }

        </div>


        <div class="family-details">
        ${
            isSelf
                ? `
                    <div class="detail-row">
                        <div class="detail-label">
                            <span class="material-symbols-outlined">assignment</span>
                            <span>Reports</span>
                        </div>
                        <strong>${escapeHTML(reports || 0)}</strong>
                    </div>
        
                    <div class="detail-row">
                        <div class="detail-label">
                            <span class="material-symbols-outlined">monitor_heart</span>
                            <span>Last Vital</span>
                        </div>
                        <span>${escapeHTML(lastVital || "Not available")}</span>
                    </div>
                `
                : ""
        }


            ${
                bloodGroup
                    ? `
                        <div class="detail-row">

                            <div class="detail-label">

                                <span class="material-symbols-outlined">
                                    bloodtype
                                </span>

                                <span>
                                    Blood Group
                                </span>

                            </div>

                            <strong>
                                ${escapeHTML(bloodGroup)}
                            </strong>

                        </div>
                    `
                    : ""
            }


            ${
                phone
                    ? `
                        <div class="detail-row">

                            <div class="detail-label">

                                <span class="material-symbols-outlined">
                                    phone
                                </span>

                                <span>
                                    Phone
                                </span>

                            </div>

                            <span>
                                ${escapeHTML(phone)}
                            </span>

                        </div>
                    `
                    : ""
            }


            ${
                dob
                    ? `
                        <div class="detail-row">

                            <div class="detail-label">

                                <span class="material-symbols-outlined">
                                    calendar_today
                                </span>

                                <span>
                                    Date of Birth
                                </span>

                            </div>

                            <span>
                                ${escapeHTML(dob)}
                            </span>

                        </div>
                    `
                    : ""
            }

            ${
                !isSelf && emergencyContact
                    ? `
                        <div class="detail-row">
                            <div class="detail-label">
                                <span class="material-symbols-outlined">emergency</span>
                                <span>ICE Contact</span>
                            </div>
                            <span>${escapeHTML(emergencyContact)}</span>
                        </div>
                    `
                    : ""
            }
            
            ${
                !isSelf && emergencyPhone
                    ? `
                        <div class="detail-row">
                            <div class="detail-label">
                                <span class="material-symbols-outlined">phone_in_talk</span>
                                <span>ICE Phone</span>
                            </div>
                            <span>${escapeHTML(emergencyPhone)}</span>
                        </div>
                    `
                    : ""
            }

<div class="family-card-actions">

    <button type="button" class="view-profile-btn">
        View Profile
    </button>

    <div class="action-icons">
        <button type="button" class="icon-btn edit-btn" title="Edit">
            <span class="material-symbols-outlined">edit</span>
        </button>
    ${
        isSelf
            ? `
                <button type="button" class="icon-btn locked-btn" title="This profile cannot be deleted" disabled>
                    <span class="material-symbols-outlined">lock</span>
                </button>
            `
            : `
                <button type="button" class="icon-btn delete-btn" title="Delete">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            `
    }
    </div>

</div>

    `;
    card.querySelector(".view-profile-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        window.location.href = `profile.html?id=${id}`;
    });

    if (!isSelf) {
        card.querySelector(".delete-btn").addEventListener("click", async (e) => {
            e.stopPropagation();
            try {
                await deleteFamilyMember(id);
                card.remove();
                familyMembersMap.delete(id);
            } catch (error) {
                console.error("Delete failed:", error);
                alert("Couldn't delete this member. Try again.");
            }
        });
    }

    // Insert before mobile Add Member card
    familyGrid.insertBefore(
        card,
        mobileAddMemberBtn
    );

}

// =========================
// SECURITY HELPER
// =========================

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}