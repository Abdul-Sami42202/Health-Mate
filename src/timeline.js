import {
    requireAuth,
    loadReports, deleteReport,
    loadVitals, deleteVital,
    getLatestInsight, saveInsight
} from "./firebase";
import { showLoader, hideLoader } from "../utilities/loader";

const timelineRail = document.getElementById("timelineRail");
const timelineEmpty = document.getElementById("timelineEmpty");
const filterChips = document.querySelectorAll(".filter-chip");

let allEvents = []; // reports + vitals, merged
let currentFilter = "all";

requireAuth(async () => {
    showLoader();
    try {
        await loadTimeline();
    } finally {
        hideLoader();
    }
});

async function loadTimeline() {
    const [reports, vitals] = await Promise.all([loadReports(), loadVitals()]);

    allEvents = [...reports, ...vitals].sort((a, b) => {
        const dateA = a.kind === "report" ? a.createdAt?.toMillis?.() || 0 : a.loggedAt?.toMillis?.() || 0;
        const dateB = b.kind === "report" ? b.createdAt?.toMillis?.() || 0 : b.loggedAt?.toMillis?.() || 0;
        return dateB - dateA;
    });

    await handleInsight(reports, vitals);
    renderTimeline();
    scrollToHashTarget();
}

function scrollToHashTarget() {
    const hash = window.location.hash;
    if (!hash) return;

    const target = document.querySelector(hash);
    if (!target) return;

    setTimeout(() => {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("highlight-pulse");
        setTimeout(() => target.classList.remove("highlight-pulse"), 2000);
    }, 100); // slight delay ensures layout has settled
}

// =========================
// AI INSIGHT — regenerate every 14 days
// =========================

async function handleInsight(reports, vitals) {
    const existing = await getLatestInsight();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

    const isStale = !existing || (Date.now() - (existing.createdAt?.toMillis?.() || 0) > SEVEN_DAYS);

    if (!isStale) {
        renderInsightCard(existing);
        return;
    }

    if (reports.length === 0 && vitals.length === 0) return; // nothing to analyze yet

    try {
        const response = await fetch("https://healthmate-ai-proxy.vercel.app/api/analyze-report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "insight",
                vitalsData: vitals.slice(0, 20),
                reportsData: reports.slice(0, 10).map(r => ({ title: r.title, summary: r.summary }))
            })
        });
        if (!response.ok) throw new Error("Insight generation failed");
        const { title, summary } = await response.json();

        await saveInsight({ title, summary });
        renderInsightCard({ title, summary, createdAt: { toDate: () => new Date() } });

    } catch (error) {
        console.error("Failed to generate insight:", error);
    }
}

function renderInsightCard(insight) {
    const existingCard = timelineRail.querySelector(".timeline-event[data-type='ai']");
    existingCard?.remove();

    const event = document.createElement("div");
    event.className = "timeline-event";
    event.dataset.type = "ai";

    const date = insight.createdAt?.toDate ? insight.createdAt.toDate() : new Date();

    event.innerHTML = `
        <div class="event-dot ai"></div>
        <div class="event-body">
            <article class="ai-event-card glass-ai ai-shimmer" tabindex="0">
                <div class="ai-event-top">
                    <div>
                        <div class="ai-event-eyebrow text-label-sm">
                            <span class="material-symbols-outlined">auto_awesome</span>
                            AI Insight Generated
                        </div>
                        <h3 class="text-title-md">${escapeHTML(insight.title)}</h3>
                        <p class="text-body-md">${escapeHTML(insight.summary)}</p>
                    </div>
                    <div class="event-timestamp">
                        <span class="date text-label-sm">${formatDate(date)}</span>
                    </div>
                </div>
            </article>
        </div>
    `;

    timelineRail.insertBefore(event, timelineRail.firstChild); // always pinned at top
}

// =========================
// RENDER REPORT + VITAL EVENTS, GROUPED BY MONTH
// =========================

function renderTimeline() {
    // Remove everything except the AI insight card (already rendered separately)
    [...timelineRail.children].forEach(child => {
        if (child.dataset.type !== "ai") child.remove();
    });

    const filtered = currentFilter === "all"
    ? allEvents
    : allEvents.filter(e => e.kind === currentFilter);

    if (filtered.length === 0) {
        timelineEmpty.classList.add("visible");
        return;
    }
    timelineEmpty.classList.remove("visible");

    let currentMonth = null;

    filtered.forEach(item => {
        const date = item.kind === "report"
            ? item.createdAt?.toDate?.() || new Date()
            : item.loggedAt?.toDate?.() || new Date();

        const monthLabel = date.toLocaleString("default", { month: "long", year: "numeric" });

        if (monthLabel !== currentMonth) {
            currentMonth = monthLabel;
            const marker = document.createElement("div");
            marker.className = "month-marker";
            marker.innerHTML = `
                <div class="month-dot"></div>
                <span class="month-label text-title-md">${escapeHTML(monthLabel)}</span>
            `;
            timelineRail.appendChild(marker);
        }

        timelineRail.appendChild(
            item.kind === "report" ? buildReportCard(item, date) : buildVitalCard(item, date)
        );
    });
}

function buildReportCard(report, date) {
    const event = document.createElement("div");
    event.className = "timeline-event";
    event.dataset.type = "report";
    event.id = `report-${report.id}`;

    const thumb = report.fileUrl && /\.(jpg|jpeg|png)$/i.test(report.fileUrl)
        ? `<img alt="${escapeHTML(report.title)}" src="${report.fileUrl}"><span class="report-thumb-badge">Image</span>`
        : `<span class="material-symbols-outlined">description</span><span class="report-thumb-badge">PDF</span>`;

    event.innerHTML = `
        <div class="event-dot report"></div>
        <div class="event-body">
            <article class="report-event-card" tabindex="0">
                <div class="report-thumb">${thumb}</div>
                <div class="report-event-main">
                    <div class="report-event-head">
                        <div>
                            <span class="report-event-tag text-label-sm">${escapeHTML(report.category || "Report")}</span>
                            <h3 class="text-title-md">${escapeHTML(report.title)}</h3>
                        </div>
                        <div class="event-timestamp">
                            <span class="date text-label-sm">${formatDate(date)}</span>
                        </div>
                    </div>
                    <p class="text-body-md">${escapeHTML(report.summary || "No summary available.")}</p>
                    <div class="report-event-actions text-label-sm">
                        <a href="report-view.html?id=${report.id}">
                            <span class="material-symbols-outlined">visibility</span> View Details
                        </a>
                        <button type="button" class="delete-event-btn">
                            <span class="material-symbols-outlined">delete</span> Delete
                        </button>
                    </div>
                </div>
            </article>
        </div>
    `;

    event.querySelector(".delete-event-btn").addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Delete this report? This cannot be undone.")) return;

        try {
            await deleteReport(report.id);
            allEvents = allEvents.filter(ev => ev.id !== report.id);
            renderTimeline();
        } catch (error) {
            console.error("Failed to delete report:", error);
            alert("Couldn't delete this report.");
        }
    });

    return event;
}

function buildVitalCard(vital, date) {
    const event = document.createElement("div");
    event.className = "timeline-event";
    event.dataset.type = "vital";
    event.id = `vital-${vital.id}`;

    const icon = vital.type === "Blood Pressure" ? "favorite"
               : vital.type === "Blood Sugar" ? "water_drop"
               : "monitor_weight";

    const unit = vital.type === "Blood Pressure" ? "mmHg"
               : vital.type === "Blood Sugar" ? "mg/dL"
               : "kg";

    event.innerHTML = `
        <div class="event-dot vital"></div>
        <div class="event-body">
            <article class="vital-event-card" tabindex="0">
                <div class="vital-event-left">
                    <div class="vital-event-icon">
                        <span class="material-symbols-outlined">${icon}</span>
                    </div>
                    <div>
                        <span class="vital-event-eyebrow text-label-sm">Vitals Logged</span>
                        <h3 class="text-title-md">${escapeHTML(vital.type)}</h3>
                        <div class="vital-event-readings">
                            <div>
                                <span class="vital-reading-label text-label-sm">Reading</span>
                                <span class="vital-reading-value text-title-md">${escapeHTML(vital.value)} <span class="text-body-md">${unit}</span></span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="vital-event-right">
                    <div class="event-timestamp">
                        <span class="date text-label-sm">${formatDate(date)}</span>
                    </div>
                    <button type="button" class="delete-event-btn" title="Delete">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
            </article>
        </div>
    `;

    event.querySelector(".delete-event-btn").addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!confirm("Delete this vitals entry? This cannot be undone.")) return;

        try {
            await deleteVital(vital.id);
            allEvents = allEvents.filter(ev => ev.id !== vital.id);
            renderTimeline();
        } catch (error) {
            console.error("Failed to delete vital:", error);
            alert("Couldn't delete this entry.");
        }
    });

    return event;
}

// =========================
// FILTERS
// =========================

filterChips.forEach(chip => {
    chip.addEventListener("click", () => {
        filterChips.forEach(c => {
            c.classList.remove("active");
            c.setAttribute("aria-pressed", "false");
        });
        chip.classList.add("active");
        chip.setAttribute("aria-pressed", "true");

        currentFilter = chip.dataset.filter;
        renderTimeline();
    });
});

// =========================
// HELPERS
// =========================

function formatDate(date) {
    return date.toLocaleDateString("default", { month: "short", day: "numeric" });
}

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}