import { getCurrentUserName, requireAuth, createVital, loadVitals, loadRecentReports, getLatestTip, saveTip } from "./firebase.js";
import { showLoader, hideLoader } from "../utilities/loader";

const welcome = document.querySelector(".text-display-lg");

requireAuth(async (user) => {
    showLoader();
    try {
        const userName = await getCurrentUserName(user.uid);
        welcome.textContent = `Welcome, ${userName}!`;
        await loadDashboard();
    } finally {
        hideLoader();
    }
});

async function loadDashboard() {
    const [vitals, reports] = await Promise.all([loadVitals(), loadRecentReports(2)]);

    renderVitalsGrid(vitals);
    renderRecentReports(reports);
    await renderDailyTip(vitals);
}

// =========================
// VITALS GRID (BP / Sugar / Weight — latest + trend)
// =========================

function renderVitalsGrid(vitals) {
    const grid = document.getElementById("vitalsGrid");
    const empty = document.getElementById("vitalsEmpty");

    if (vitals.length === 0) {
        grid.style.display = "none";
        empty.style.display = "flex";
        return;
    }

    grid.style.display = "grid";
    empty.style.display = "none";

    ["Blood Pressure", "Blood Sugar", "Weight"].forEach(type => {
        const entries = vitals.filter(v => v.type === type); // newest first
        const card = document.getElementById(`vitalCard-${type}`);
        if (!card) return;

        const valueEl = card.querySelector(".vital-value");
        const chartEl = card.querySelector(".vital-chart");

        if (entries.length === 0) {
            valueEl.textContent = "--";
            chartEl.innerHTML = "";
            card.href = "#";
            card.style.pointerEvents = "none";
            card.style.opacity = "0.5";
            return;
        }

        card.style.pointerEvents = "auto";
        card.style.opacity = "1";

        const latest = entries[0];
        valueEl.textContent = latest.value;
        card.href = `timeline.html#vital-${latest.id}`;

        // Build trend chart from up to the last 6 entries, oldest -> newest
        const recent = entries.slice(0, 6).reverse();
        const numericValues = recent.map(e => parseFloat(String(e.value).split("/")[0]) || 0);
        const max = Math.max(...numericValues);
        const min = Math.min(...numericValues);
        const range = max - min || 1;

        chartEl.innerHTML = numericValues.map(v => {
            const heightPct = Math.max(15, Math.round(((v - min) / range) * 100));
            const colorClass = type === "Blood Pressure" ? "primary" : type === "Blood Sugar" ? "secondary" : "tertiary";
            return `<div class="vital-bar ${colorClass}" style="height: ${heightPct}%;"></div>`;
        }).join("");
    });
}

// =========================
// RECENT REPORTS
// =========================

function renderRecentReports(reports) {
    const card = document.getElementById("reportsCard");
    const empty = document.getElementById("reportsEmpty");
    const timeline = document.getElementById("dashboardReportsTimeline");

    if (reports.length === 0) {
        card.style.display = "none";
        empty.style.display = "flex";
        return;
    }

    card.style.display = "block";
    empty.style.display = "none";
    timeline.innerHTML = "";

    reports.forEach((report, i) => {
        const date = report.createdAt?.toDate?.() || new Date();
        const dotClass = i === 0 ? "primary" : "secondary";
        const dateClass = i === 0 ? "primary" : "secondary";

        const item = document.createElement("div");
        item.className = "timeline-item";
        item.innerHTML = `
            <div class="timeline-dot ${dotClass}"></div>
            <div class="timeline-content">
                <div>
                    <h4 class="timeline-title text-body-lg">${escapeHTML(report.title)}</h4>
                    <p class="timeline-subtitle text-body-md">${escapeHTML(report.category || "Report")}</p>
                </div>
                <div class="timeline-date ${dateClass}">
                    <span class="material-symbols-outlined" style="font-size: 16px;">calendar_today</span>
                    <span class="text-label-sm">${date.toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
            </div>
        `;
        item.style.cursor = "pointer";
        item.addEventListener("click", () => {
            window.location.href = `report-view.html?id=${report.id}`;
        });

        timeline.appendChild(item);
    });
}

// =========================
// AI TIP OF THE DAY (regenerates once per 24h)
// =========================

async function renderDailyTip(vitals) {
    const tipCard = document.getElementById("aiTipCard");
    const tipEmpty = document.getElementById("aiTipEmpty");
    const tipText = document.getElementById("aiTipText");

    if (vitals.length === 0) {
        tipCard.style.display = "none";
        tipEmpty.style.display = "flex";
        return;
    }

    tipEmpty.style.display = "none";
    tipCard.style.display = "block";

    const existing = await getLatestTip();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const isStale = !existing || (Date.now() - (existing.createdAt?.toMillis?.() || 0) > ONE_DAY);

    if (!isStale) {
        tipText.textContent = existing.summary;
        return;
    }

    tipText.textContent = "Analyzing your latest vitals...";

    try {
        const response = await fetch("https://healthmate-ai-proxy.vercel.app/api/analyze-report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "tip",
                vitalsData: vitals.slice(0, 4)
            })
        });

        if (!response.ok) throw new Error("Tip generation failed");
        const { summary } = await response.json();

        await saveTip(summary);
        tipText.textContent = summary;

    } catch (error) {
        console.error("Failed to generate daily tip:", error);
        tipText.textContent = "Couldn't generate a tip right now. Check back later.";
    }
}

// =========================
// MANUAL VITALS ENTRY
// =========================

const vitalForm = document.querySelector(".manual-entry-card form");
const vitalTypeSelect = vitalForm.querySelector("select");
const vitalValueInput = vitalForm.querySelector("input");
const saveBtn = document.querySelector(".btn-save");

saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const type = vitalTypeSelect.value;
    const value = vitalValueInput.value.trim();

    if (!value) {
        alert("Please enter a value.");
        return;
    }

    saveBtn.disabled = true;
    const originalText = saveBtn.textContent;
    saveBtn.textContent = "Saving...";

    try {
        await createVital({ type, value });
        vitalValueInput.value = "";
        await loadDashboard(); // ✅ refresh everything with the new entry included
    } catch (error) {
        console.error("Failed to save vital:", error);
        alert("Failed to save. Please try again.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
});

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}