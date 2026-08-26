const API_URL = "https://temp-file-drop.onrender.com";


// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

const toastContainer =
    document.getElementById("toastContainer");


function showToast(
    title,
    message = "",
    type = "info",
    duration = 4000
) {

    // Make sure toast container exists
    if (!toastContainer) {
        return;
    }

    const toast =
        document.createElement("div");

    toast.className =
        `toast ${type}`;


    const icons = {
        success: "✓",
        error: "!",
        warning: "!",
        info: "i"
    };


    toast.innerHTML = `
        <div class="toast-icon">
            ${icons[type] || "i"}
        </div>

        <div class="toast-content">

            <p class="toast-title">
                ${title}
            </p>

            ${
                message
                    ? `
                        <p class="toast-message">
                            ${message}
                        </p>
                    `
                    : ""
            }

        </div>

        <button
            class="toast-close"
            type="button"
            aria-label="Close notification"
        >
            ×
        </button>
    `;


    toastContainer.appendChild(toast);


    const closeToast = () => {

        if (
            !toast ||
            !toast.isConnected
        ) {
            return;
        }

        toast.classList.add("removing");

        setTimeout(() => {

            if (toast.isConnected) {
                toast.remove();
            }

        }, 250);
    };


    toast
        .querySelector(".toast-close")
        .addEventListener(
            "click",
            closeToast
        );


    if (duration > 0) {

        setTimeout(
            closeToast,
            duration
        );
    }
}


// ============================================================
// UPLOAD
// ============================================================

const dropZone =
    document.getElementById("dropZone");

const fileInput =
    document.getElementById("fileInput");

const selectButton =
    document.getElementById("selectButton");

const fileList =
    document.getElementById("fileList");


// ============================================================
// OPEN FILE PICKER
// ============================================================

selectButton.addEventListener(
    "click",
    () => {

        fileInput.click();
    }
);


// ============================================================
// FILES SELECTED THROUGH PICKER
// ============================================================

fileInput.addEventListener(
    "change",
    () => {

        handleFiles(
            fileInput.files
        );
    }
);


// ============================================================
// DRAG OVER
// ============================================================

dropZone.addEventListener(
    "dragover",
    (event) => {

        event.preventDefault();

        dropZone.classList.add(
            "dragging"
        );
    }
);


// ============================================================
// DRAG LEAVE
// ============================================================

dropZone.addEventListener(
    "dragleave",
    () => {

        dropZone.classList.remove(
            "dragging"
        );
    }
);


// ============================================================
// FILES DROPPED
// ============================================================

dropZone.addEventListener(
    "drop",
    (event) => {

        event.preventDefault();

        dropZone.classList.remove(
            "dragging"
        );

        handleFiles(
            event.dataTransfer.files
        );
    }
);


// ============================================================
// HANDLE SELECTED FILES
// ============================================================

async function handleFiles(files) {

    if (
        !files ||
        files.length === 0
    ) {
        return;
    }


    fileList.innerHTML = "";


    for (
        const file of files
    ) {

        await uploadFile(file);
    }
}


// ============================================================
// UPLOAD ONE FILE
// ============================================================

async function uploadFile(file) {

    const item =
        document.createElement("div");


    item.className =
        "file-item";


    item.innerHTML = `
        <div class="file-info">

            <strong></strong>

            <span class="file-size"></span>

            <div class="progress-container">

                <div class="progress-bar"></div>

            </div>

            <span class="upload-status">
                Preparing upload...
            </span>

        </div>
    `;


    item.querySelector(
        "strong"
    ).textContent =
        file.name;


    item.querySelector(
        ".file-size"
    ).textContent =
        formatFileSize(
            file.size
        );


    fileList.appendChild(item);


    const progressBar =
        item.querySelector(
            ".progress-bar"
        );


    const status =
        item.querySelector(
            ".upload-status"
        );


    try {

        // ----------------------------------------------------
        // STEP 1
        // Ask backend for signed B2 upload URL
        // ----------------------------------------------------

        status.textContent =
            "Preparing upload...";


        const initResponse =
            await fetch(
                `${API_URL}/api/upload/init`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        fileName:
                            file.name,

                        fileSize:
                            file.size,

                        mimeType:
                            file.type ||
                            "application/octet-stream"

                    })
                }
            );


        if (!initResponse.ok) {

            let errorMessage =
                "Failed to initialize upload";


            try {

                const errorData =
                    await initResponse.json();

                errorMessage =
                    errorData.error ||
                    errorMessage;

            } catch {
                // Ignore invalid error response
            }


            throw new Error(
                errorMessage
            );
        }


        const uploadData =
            await initResponse.json();


        // ----------------------------------------------------
        // STEP 2
        // Upload directly to Backblaze B2
        // ----------------------------------------------------

        status.textContent =
            "Uploading...";


        await uploadToB2(
            uploadData.uploadUrl,
            file,
            progressBar
        );


        // ----------------------------------------------------
        // STEP 3
        // Upload successful
        // ----------------------------------------------------

        progressBar.style.width =
            "100%";


        status.textContent =
            "Upload complete";


        // ----------------------------------------------------
        // Display access code
        // ----------------------------------------------------

        const code =
            document.createElement("div");


        code.className =
            "access-code";


        code.innerHTML = `
            <span>ACCESS CODE</span>

            <strong></strong>

            <small>
                Valid for 30 days
            </small>
        `;


        // Don't inject the code through innerHTML.
        code.querySelector(
            "strong"
        ).textContent =
            uploadData.accessCode;


        item.appendChild(code);


        // ----------------------------------------------------
        // SUCCESS TOAST
        // ----------------------------------------------------

        showToast(
            "Upload complete",
            `Access code: ${uploadData.accessCode}`,
            "success",
            7000
        );

    } catch (error) {

        status.textContent =
            "Upload failed. Please try again.";


        progressBar.style.width =
            "0%";


        // ----------------------------------------------------
        // ERROR TOAST
        // ----------------------------------------------------

        showToast(
            "Upload failed",
            error.message ||
            "Please try again.",
            "error"
        );
    }
}


// ============================================================
// UPLOAD DIRECTLY TO BACKBLAZE B2
// ============================================================

function uploadToB2(
    uploadUrl,
    file,
    progressBar
) {

    return new Promise(
        (resolve, reject) => {

            const xhr =
                new XMLHttpRequest();


            xhr.open(
                "PUT",
                uploadUrl,
                true
            );


            // ------------------------------------------------
            // Upload progress
            // ------------------------------------------------

            xhr.upload.onprogress =
                (event) => {

                    if (
                        !event.lengthComputable
                    ) {
                        return;
                    }


                    const percentage =
                        (
                            event.loaded /
                            event.total
                        ) * 100;


                    progressBar.style.width =
                        `${percentage}%`;
                };


            // ------------------------------------------------
            // Upload completed
            // ------------------------------------------------

            xhr.onload =
                () => {

                    if (
                        xhr.status >= 200 &&
                        xhr.status < 300
                    ) {

                        resolve();

                    } else {

                        reject(
                            new Error(
                                `B2 upload failed: ${xhr.status}`
                            )
                        );
                    }
                };


            // ------------------------------------------------
            // Network error
            // ------------------------------------------------

            xhr.onerror =
                () => {

                    reject(
                        new Error(
                            "Network error while uploading"
                        )
                    );
                };


            // ------------------------------------------------
            // Upload cancelled
            // ------------------------------------------------

            xhr.onabort =
                () => {

                    reject(
                        new Error(
                            "Upload cancelled"
                        )
                    );
                };


            xhr.send(file);
        }
    );
}


// ============================================================
// DOWNLOAD
// ============================================================

const downloadCode =
    document.getElementById(
        "downloadCode"
    );


const downloadButton =
    document.getElementById(
        "downloadButton"
    );


const downloadStatus =
    document.getElementById(
        "downloadStatus"
    );


// ============================================================
// DOWNLOAD EVENT LISTENERS
// ============================================================

if (
    downloadCode &&
    downloadButton &&
    downloadStatus
) {

    downloadButton.addEventListener(
        "click",
        downloadFile
    );


    // Allow pressing Enter
    downloadCode.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Enter"
            ) {

                downloadFile();
            }
        }
    );
}


// ============================================================
// DOWNLOAD FILE
// ============================================================

async function downloadFile() {

    const accessCode =
        downloadCode.value.trim();


    // --------------------------------------------------------
    // Validate 4-digit code
    // --------------------------------------------------------

    if (
        !/^\d{4}$/.test(
            accessCode
        )
    ) {

        downloadStatus.textContent =
            "Enter a valid 4-digit code.";


        showToast(
            "Invalid code",
            "Enter a valid 4-digit access code.",
            "warning"
        );


        return;
    }


    downloadButton.disabled =
        true;


    downloadStatus.textContent =
        "Preparing download...";


    try {

        // ----------------------------------------------------
        // STEP 1
        // Ask backend for signed download URL
        // ----------------------------------------------------

        const response =
            await fetch(
                `${API_URL}/api/download/init`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        accessCode
                    })
                }
            );


        const data =
            await response.json();


        // ----------------------------------------------------
        // Handle backend errors
        // ----------------------------------------------------

        if (!response.ok) {

            throw new Error(
                data.error ||
                "Download failed"
            );
        }


        // ----------------------------------------------------
        // STEP 2
        // Start download
        // ----------------------------------------------------

        downloadStatus.textContent =
            `Downloading ${data.fileName}...`;


        const link =
            document.createElement("a");


        link.href =
            data.downloadUrl;


        link.download =
            data.fileName;


        // Important for browsers
        link.style.display =
            "none";


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        downloadStatus.textContent =
            "Download started.";


        // ----------------------------------------------------
        // SUCCESS TOAST
        // ----------------------------------------------------

        showToast(
            "Download started",
            data.fileName,
            "success"
        );


    } catch (error) {

        downloadStatus.textContent =
            error.message ||
            "Download failed.";


        // ----------------------------------------------------
        // ERROR TOAST
        // ----------------------------------------------------

        showToast(
            "Download failed",
            error.message ||
            "Unable to download the file.",
            "error"
        );


    } finally {

        downloadButton.disabled =
            false;
    }
}


// ============================================================
// FILE SIZE
// ============================================================

function formatFileSize(bytes) {

    if (
        bytes === 0
    ) {

        return "0 Bytes";
    }


    const units = [
        "Bytes",
        "KB",
        "MB",
        "GB",
        "TB"
    ];


    const index =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );


    return (
        bytes /
        Math.pow(
            1024,
            index
        )
    ).toFixed(2)
    + " "
    + units[index];
}