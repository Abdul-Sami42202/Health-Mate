import { setError } from "../utilities/errorMessage";
import { uploadToCloudinary } from "./cloudinary";
import { createReport, requireAuth } from "./firebase";
import { showLoader, hideLoader } from "../utilities/loader";

requireAuth();

// ---- Dropzone: click-to-browse + drag & drop ----
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const dropzoneTitle = document.getElementById('dropzoneTitle');
const dropzoneHint = document.getElementById('dropzoneHint');

function updateDropzoneLabel() {
    const files = fileInput.files;
    if (!files || files.length === 0) {
        dropzoneTitle.textContent = 'Drag & Drop files here';
        dropzoneHint.textContent = 'or click to browse your device';
    } else if (files.length === 1) {
        dropzoneTitle.textContent = files[0].name;
        dropzoneHint.textContent = 'Click to choose a different file';
    } else {
        dropzoneTitle.textContent = `${files.length} files selected`;
        dropzoneHint.textContent = 'Click to choose different files';
    }
}

dropzone.addEventListener('click', () => fileInput.click());

dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
    }
});

['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
});

['dragleave', 'dragend'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
    });
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        updateDropzoneLabel();
    }
});

fileInput.addEventListener('change', updateDropzoneLabel);

// ---- Date field: clicking the calendar icon opens the native picker ----
const dateInput = document.getElementById('report-date');
const dateIcon = document.getElementById('dateIcon');
const reportCatagory = document.getElementById('report-category');
const reportTitle = document.getElementById('report-title');
const processBtn = document.getElementById('process-btn');
const aiToggle = document.getElementById('aiToggle');
const toggle = document.getElementById('toggle');
const form = document.getElementById('upload-report-form')

dateIcon.addEventListener('click', () => {
    if (typeof dateInput.showPicker === 'function') {
        dateInput.showPicker();
    } else {
        dateInput.focus();
    }
});

let aiSummaryEnabled = aiToggle.checked; // true, since your checkbox starts with `checked`

aiToggle.addEventListener('change', () => {
    aiSummaryEnabled = aiToggle.checked;
    toggle.textContent = aiSummaryEnabled ? 'Enabled' : 'Disabled';
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (fileInput.files.length === 0) {
        setError(form, 'file-error', 'Please upload the report');
        return;
    }
    setError(form, 'file-error', null);

    const file = fileInput.files[0];
    const title = reportTitle.value.trim();
    const date = dateInput.value;
    const category = reportCatagory.value;

    processBtn.disabled = true;
    processBtn.textContent = "Processing...";

    showLoader();
    try {
        // 1. Upload the file to Cloudinary (as you already do for images)
        const fileUrl = await uploadToCloudinary(file);

        let aiData = {};

        if (aiSummaryEnabled) {
            // 2. Convert file to base64 for Gemini
            const fileBase64 = await fileToBase64(file);

            // 3. Call your Vercel function
            const response = await fetch("https://healthmate-ai-proxy.vercel.app/api/analyze-report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileBase64, mimeType: file.type })
            });

            if (!response.ok) throw new Error("AI analysis failed");
            aiData = await response.json();
        }

        // 4. Save everything to Firestore
        const reportId = await createReport({
            title,
            date,
            category,
            fileUrl,
            aiEnabled: aiSummaryEnabled,
            ...aiData
        });

        // 5. Redirect
        window.location.href = `report-view.html?id=${reportId}`;

    } catch (error) {
        console.error(error);
        setError(form, 'file-error', 'Something went wrong. Please try again.');
        processBtn.disabled = false;
        processBtn.textContent = "Process Report";
    } finally {
        hideLoader();
    }
});

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]); // strip the data: prefix
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}