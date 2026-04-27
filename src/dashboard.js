import { db, auth, familyMembersData, loadFamilyMembers, onAuthStateChanged, ensureYouCardExists, signOutFunction, getCurrentUserName } from "./firebase.js";

const logoutBtn = document.getElementById("logoutBtn");

logoutBtn?.addEventListener("click", async () => {
  try {
    await signOutFunction();
  } catch (error) {
    console.error("Logout failed:", error);
  }
});

const modal = document.getElementById("familyModal")
const openBtn = document.querySelectorAll(".family-card-add"); // your add button
const closeBtn = document.getElementById("closeModal");
const colors = document.querySelectorAll('.color-box')

const nameInput = document.querySelector(".name");
const relationInput = document.querySelector(".relation");

openBtn.forEach(btn => {
  btn.addEventListener("click", () => {
    modal.classList.add("active");
  });
});

closeBtn?.addEventListener('click', () => {
  modal.classList.remove('active');
  nameInput.value = "";
  relationInput.value = "";
});

colors.forEach((box) => {
  box.addEventListener('click', () => {
    colors.forEach(c => {
      c.classList.remove('active')
      box.classList.add('active')
    });
  });
});

modal.addEventListener('click', e => {
  if (e.target === modal) {
    modal.classList.remove('active')
  }
})

const saveBtn = document.querySelector('.btn-save')
const familyGrid = document.querySelector(".family-grid")
const familyCards = document.querySelectorAll(".family-card")
const loader = document.getElementById("loader");

function showLoader() {
  loader.classList.remove("hidden");
}

function hideLoader() {
  loader.classList.add("hidden");
}

function currentDate() {
  let date = new Date()
  let currentMonth = date.toLocaleString('en-US', { month: 'short' })
  let currentDate = date.getDate()
  let currentYear = date.getFullYear()

  let lastActivity = `${currentMonth} ${currentDate}, ${currentYear}`
  return lastActivity;
}

saveBtn.addEventListener('click', async () => {
  
  const customId = document.querySelector('.custom-id').value
  const familyMemberName = document.querySelector(".name").value;
  const relation = document.querySelector('.relation').value;
  const selectedColor = document.querySelector('.color-box.active');
  let color = selectedColor ? selectedColor.dataset.color : "blue";

  const nameError = document.querySelector(".name-error");
  const relationError = document.querySelector(".relation-error");

    // Clear previous errors
    nameError.textContent = "";
    relationError.textContent = "";

    let isValid = true;

  if (!familyMemberName.trim()) {
    nameError.textContent = "required";
    isValid = false;
  }
  if (!relation.trim()) {
    relationError.textContent = "required";
    isValid = false;
  }
  if (!isValid) return; //stop ececuton
  
  try {
    showLoader();
    await familyMembersData(familyMemberName, relation, customId, color, new Date());

    renderFamilyCard({ name: familyMemberName, relation, customId, color, lastActivity: new Date() })

    modal.classList.remove('active');

    nameInput.value = "";   // clear inputs after success
    relationInput.value = "";

  } catch (error) {
    console.error("Error adding family member:", error);
    throw error
  } finally {
    hideLoader();
  }

})

function renderFamilyCard({ name, relation,customId, color, lastActivity }) {

  const displayRole = customId ? customId : relation;
  const activityStr = lastActivity instanceof Date
    ? `${lastActivity.toLocaleString('en-US', { month: 'short' })} ${lastActivity.getDate()}, ${lastActivity.getFullYear()}`
    : lastActivity;

  const cardHTML = `
    <article class="family-card family-card-${color}">
      <header class="family-card-header">
        <div class="avatar avatar-${color}">
          <span class="avatar-initial">${name.charAt(0).toUpperCase()}</span>
        </div>
        <div class="family-card-meta">
          <h2 class="family-card-name">${name}</h2>
          <p class="family-card-role">${displayRole}</p>
        </div>
        <p class="family-card-activity">
          <span class="activity-label">Last activity</span>
          <span class="activity-date">${activityStr}</span>
        </p>
      </header>
      <footer class="family-card-footer">
        <button class="chip chip-outline">Edit</button>
        <button class="chip chip-outline">Delete</button>
        <button class="chip chip-primary">Open</button>
      </footer>
    </article>
  `;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = cardHTML;

  const addCard = familyGrid.querySelector(".family-card-add");
  familyGrid.insertBefore(wrapper.firstElementChild, addCard);
}

async function initDashboard() {
  if (!auth.currentUser) return;

  const snapshot = await loadFamilyMembers(); // Get docs from Firebase
  snapshot.forEach(doc => {
    renderFamilyCard({
      name: doc.data().memberName,
      relation: doc.data().relation,
      color: doc.data().color,
      lastActivity: doc.data().lastActivity.toDate ? doc.data().lastActivity.toDate() : doc.data().lastActivity
    });
  });
}

// Call after auth state is ready
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "./signin.html";
  } else {
    const userName = await getCurrentUserName(user.uid);
    // use userName wherever you want, e.g., display a welcome message
    console.log("Welcome,", userName);
    await ensureYouCardExists(user, userName);
    initDashboard();
  }
});