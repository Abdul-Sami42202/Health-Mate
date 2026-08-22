import { requireAuth, getReport } from "./firebase";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

let currentReport = null;
let cachedPdfBlob = null;
let pdfGenerationPromise = null; // prevents generating the PDF twice concurrently

const params = new URLSearchParams(window.location.search);
const reportId = params.get("id");

requireAuth(async () => {
    const report = await getReport(reportId);
    if (!report) {
        alert("Report not found");
        window.location.href = "reports.html";
        return;
    }
    currentReport = report;
    renderReport(report);

    // Pre-generate in the background so Share/Download feel instant.
    // If this fails (e.g. offline, bad image URL), we just log it here —
    // getOrGeneratePdf() will transparently retry the next time either
    // button is actually clicked, instead of leaving them permanently dead.
    getOrGeneratePdf().catch(error => {
        console.error("Failed to pre-generate PDF:", error);
    });
});

// =========================
// BUILD THE PDF (shared by both buttons)
// =========================

const downloadBtn = document.getElementById("downloadBtn");
const shareBtn = document.getElementById("shareBtn");

async function generateReportPDF(report) {
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 32;
    let availableHeight = pageHeight - margin * 2;

    // ----- PAGE 1: Original report image -----
    if (report.fileUrl) {
        const img = await loadImage(report.fileUrl);
        const imgProps = pdf.getImageProperties(img);
        const availableWidth = pageWidth - margin * 2;

        let drawWidth = availableWidth;
        let drawHeight = (imgProps.height * drawWidth) / imgProps.width;

        if (drawHeight > availableHeight) {
            drawHeight = availableHeight;
            drawWidth = (imgProps.width * drawHeight) / imgProps.height;
        }

        pdf.setFontSize(16);
        pdf.text(report.title || "Medical Report", margin, margin);

        pdf.addImage(img, "JPEG", margin, margin + 24, drawWidth, drawHeight);
    } else {
        pdf.setFontSize(16);
        pdf.text(report.title || "Medical Report", margin, margin + 20);
        pdf.setFontSize(11);
        pdf.text("No document preview available.", margin, margin + 50);
    }

    // ----- PAGE 2: Screenshot the actual AI insights card -----
    // Only attempted when the card is enabled AND actually rendered.
    // html2canvas computes gradient color-stop offsets as distance/lineLength;
    // if the element is hidden (e.g. via `display:none` on an ancestor when
    // aiEnabled is false), lineLength is 0 and that division produces NaN,
    // which addColorStop() rejects as a "non-finite" value. That was the
    // crash you were seeing on both Download and the background pre-generate.
    if (report.aiEnabled) {
        const aiCard = document.querySelector(".ai-glass-card");
        const isRenderable = aiCard && aiCard.offsetWidth > 0 && aiCard.offsetHeight > 0;

        pdf.addPage();

        if (isRenderable) {
            try {
                const canvas = await html2canvas(aiCard, {
                    scale: 2,          // sharper output
                    backgroundColor: "#ffffff",
                    useCORS: true,
                    onclone: (clonedDoc) => {
                        // backdrop-filter isn't supported by html2canvas and
                        // can produce rendering artifacts/instability during
                        // capture — strip it from the cloned node it paints.
                        const clonedCard = clonedDoc.querySelector(".ai-glass-card");
                        if (clonedCard) {
                            clonedCard.style.backdropFilter = "none";
                            clonedCard.style.webkitBackdropFilter = "none";
                        }
                    }
                });

                const cardImg = canvas.toDataURL("image/png");
                let cardWidth = pageWidth - margin * 2;
                let cardHeight = (canvas.height * cardWidth) / canvas.width;

                if (cardHeight > availableHeight) {
                    cardHeight = availableHeight;
                    cardWidth = (canvas.width * cardHeight) / canvas.height;
                }

                pdf.addImage(cardImg, "PNG", margin, margin, cardWidth, cardHeight);
            } catch (error) {
                // Don't let a failed screenshot take down the whole PDF —
                // the person can still get page 1.
                console.error("Failed to capture AI insights card:", error);
                pdf.setFontSize(11);
                pdf.text("AI insights could not be rendered for this PDF.", margin, margin);
            }
        } else {
            pdf.setFontSize(11);
            pdf.text("AI insights are not available for this report.", margin, margin);
        }
    }

    return pdf;
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous"; // needed since Cloudinary images are cross-origin
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

// =========================
// SHARED PDF ACCESSOR — used by both buttons
// =========================
// Returns the cached blob if we already have one; otherwise generates it
// (de-duped so concurrent calls don't trigger multiple html2canvas runs)
// and caches the result for next time.
function getOrGeneratePdf() {
    if (cachedPdfBlob) {
        return Promise.resolve(cachedPdfBlob);
    }
    if (!pdfGenerationPromise) {
        pdfGenerationPromise = generateReportPDF(currentReport)
            .then(pdf => {
                cachedPdfBlob = pdf.output("blob");
                return cachedPdfBlob;
            })
            .finally(() => {
                pdfGenerationPromise = null;
            });
    }
    return pdfGenerationPromise;
}

// =========================
// DOWNLOAD BUTTON — always just saves the file
// =========================

downloadBtn?.addEventListener("click", async () => {
    if (!currentReport) return;

    downloadBtn.disabled = true;
    try {
        const blob = await getOrGeneratePdf();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${currentReport.title || "report"}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to generate PDF:", error);
        alert("Couldn't generate the PDF. Please try again.");
    } finally {
        downloadBtn.disabled = false;
    }
});

// =========================
// SHARE BUTTON — native share sheet ONLY, no download fallback
// =========================

shareBtn?.addEventListener("click", async () => {
    if (!currentReport) return;

    shareBtn.disabled = true;
    try {
        // Generates on demand if the background pre-generation hasn't
        // finished yet (or failed) — Share never silently no-ops anymore.
        const blob = await getOrGeneratePdf();
        const file = new File([blob], `${currentReport.title || "report"}.pdf`, { type: "application/pdf" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: currentReport.title || "Medical Report",
                text: "Shared from HealthMate"
            });
        } else {
            alert("Sharing isn't supported on this browser. Please use the Download button instead.");
        }
    } catch (error) {
        if (error.name !== "AbortError") {
            console.error("Failed to share PDF:", error);
            alert("Couldn't share the file. Please try again.");
        }
    } finally {
        shareBtn.disabled = false;
    }
});
///////////////////////////////////////////////////////////////////

function renderReport(report) {
    document.querySelector(".report-header h2").textContent = report.title;
    document.querySelector(".report-meta").textContent = `Uploaded on ${report.date}`;
    document.querySelector(".preview-card-body img").src = report.fileUrl;

    const insightsCol = document.querySelector(".insights-col");
    const reportGrid = document.querySelector(".report-grid");

    if (!report.aiEnabled) {
        insightsCol.style.display = "none";
        reportGrid.classList.add("ai-disabled");
        return;
    }

    // Summary text
    document.querySelector(".ai-summary-text").textContent = report.summary || "No summary available.";

    // Flags
    renderFlags(report.flags || []);

    // Questions for doctor
    renderQuestions(report.questionsForDoctor || []);

    // Diet guidance
    renderDietGuidance(report.dietGuidance || {});
}

function renderFlags(flags) {
    const grid = document.querySelector(".flags-grid");
    grid.innerHTML = ""; // clear the static placeholder cards

    if (flags.length === 0) {
        grid.innerHTML = `<p class="text-body-md">No specific values flagged.</p>`;
        return;
    }

    flags.forEach(flag => {
        const isAbnormal = flag.status === "low" || flag.status === "high";
        const arrow = flag.status === "low" ? "arrow_downward" : flag.status === "high" ? "arrow_upward" : "";

        const card = document.createElement("div");
        card.className = `flag-card ${isAbnormal ? "flag-error" : ""}`;

        card.innerHTML = `
            <div class="flag-info">
                <span class="flag-name ${isAbnormal ? "" : "flag-name-neutral"}">${escapeHTML(flag.name)}</span>
                <span class="flag-ref">Ref: ${escapeHTML(flag.ref)}</span>
            </div>
            <div class="flag-value-col">
                <span class="flag-value ${isAbnormal ? "" : "flag-value-neutral"}">
                    ${escapeHTML(flag.value)}
                    ${arrow ? `<span class="material-symbols-outlined">${arrow}</span>` : ""}
                </span>
                <span class="flag-tag ${isAbnormal ? "flag-tag-error" : "flag-tag-neutral"}">
                    ${escapeHTML(flag.status)}
                </span>
            </div>
        `;

        grid.appendChild(card);
    });
}

function renderQuestions(questions) {
    const list = document.querySelector(".action-list");
    list.innerHTML = "";

    if (questions.length === 0) {
        list.innerHTML = `<li>No specific questions generated.</li>`;
        return;
    }

    questions.forEach(question => {
        const li = document.createElement("li");
        li.textContent = question; // textContent auto-escapes, no need for escapeHTML here
        list.appendChild(li);
    });
}

function renderDietGuidance(dietGuidance) {
    const actionCards = document.querySelectorAll(".action-card");
    const dietCard = actionCards[1]; // second .action-card is the Diet Guidance one

    const eatBlock = dietCard.querySelectorAll(".diet-block")[0];
    const avoidBlock = dietCard.querySelectorAll(".diet-block")[1];

    eatBlock.querySelector(".diet-text").textContent = dietGuidance.eat || "Not specified.";
    avoidBlock.querySelector(".diet-text").textContent = dietGuidance.avoid || "Not specified.";
}

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}



const images = document.querySelectorAll(".zoomable-img");

const viewer = document.getElementById("imageViewer");
const viewerImage = document.getElementById("viewerImage");
const closeViewer = document.getElementById("closeViewer");

let scale = 1;
let translateX = 0;
let translateY = 0;

let isDragging = false;
let startX = 0;
let startY = 0;

function updateTransform() {
  viewerImage.style.transform =
    `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}

function resetImage() {
  scale = 1;
  translateX = 0;
  translateY = 0;

  updateTransform();
}

/* OPEN IMAGE */

images.forEach((image) => {
  image.addEventListener("click", () => {
    viewerImage.src = image.src;
    viewer.classList.add("active");

    resetImage();
  });
});

/* CLOSE */

function closeImageViewer() {
  viewer.classList.remove("active");
  viewerImage.src = "";

  resetImage();
}

closeViewer.addEventListener("click", closeImageViewer);

viewer.addEventListener("click", (e) => {
  if (e.target === viewer || e.target.classList.contains("image-container")) {
    closeImageViewer();
  }
});

/* ESC KEY */

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeImageViewer();
  }
});

/* MOUSE WHEEL ZOOM */

viewerImage.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();

    const zoomSpeed = 0.15;

    if (e.deltaY < 0) {
      scale += zoomSpeed;
    } else {
      scale -= zoomSpeed;
    }

    scale = Math.min(Math.max(1, scale), 5);

    if (scale === 1) {
      translateX = 0;
      translateY = 0;
    }

    updateTransform();
  },
  { passive: false }
);

/* DOUBLE CLICK ZOOM */

viewerImage.addEventListener("dblclick", () => {
  if (scale === 1) {
    scale = 2;
  } else {
    scale = 1;
    translateX = 0;
    translateY = 0;
  }

  updateTransform();
});

/* DRAG IMAGE */

viewerImage.addEventListener("mousedown", (e) => {
  if (scale <= 1) return;

  isDragging = true;

  startX = e.clientX - translateX;
  startY = e.clientY - translateY;

  viewerImage.classList.add("dragging");
});

document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  translateX = e.clientX - startX;
  translateY = e.clientY - startY;

  updateTransform();
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  viewerImage.classList.remove("dragging");
});