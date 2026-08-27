// ========================================
// CONFIGURATION
// ========================================

const API_URL = "https://temp-file-drop.onrender.com";


// ========================================
// ELEMENTS
// ========================================

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const selectButton = document.getElementById("selectButton");
const fileList = document.getElementById("fileList");

const downloadCode = document.getElementById("downloadCode");
const downloadButton = document.getElementById("downloadButton");
const downloadStatus = document.getElementById("downloadStatus");


// ========================================
// FILE PICKER
// ========================================

selectButton.addEventListener("click", () => {
    fileInput.click();
});


fileInput.addEventListener("change", () => {

    handleFiles(fileInput.files);

    // Allow selecting the same file again
    fileInput.value = "";
});


// ========================================
// DRAG & DROP
// ========================================

dropZone.addEventListener("dragover", (event) => {

    event.preventDefault();

    dropZone.classList.add("dragging");
});


dropZone.addEventListener("dragleave", () => {

    dropZone.classList.remove("dragging");
});


dropZone.addEventListener("drop", (event) => {

    event.preventDefault();

    dropZone.classList.remove("dragging");

    handleFiles(event.dataTransfer.files);
});


// ========================================
// HANDLE FILES
// ========================================

async function handleFiles(files) {

    if (!files || files.length === 0) {
        return;
    }

    fileList.innerHTML = "";

    // Upload files one at a time
    for (const file of files) {
        await uploadFile(file);
    }
}


// ========================================
// UPLOAD FILE
// ========================================

async function uploadFile(file) {

    const item = document.createElement("div");

    item.className = "file-item";

    item.innerHTML = `
        <div class="file-info">

            <strong class="file-name"></strong>

            <span class="file-size"></span>

            <div class="progress-container">
                <div class="progress-bar"></div>
            </div>

            <span class="upload-status">
                Preparing upload...
            </span>

        </div>
    `;


    item.querySelector(".file-name").textContent =
        file.name;

    item.querySelector(".file-size").textContent =
        formatFileSize(file.size);


    fileList.appendChild(item);


    const progressBar =
        item.querySelector(".progress-bar");

    const status =
        item.querySelector(".upload-status");


    try {

        // ========================================
        // STEP 1
        // Ask Render backend for upload URL
        // ========================================

        status.textContent =
            "Preparing upload...";


        const response = await fetch(
            `${API_URL}/api/upload/init`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    fileName: file.name,

                    fileSize: file.size,

                    mimeType:
                        file.type ||
                        "application/octet-stream"
                })
            }
        );


        let data = null;


        try {
            data = await response.json();
        } catch {
            data = null;
        }


        if (!response.ok) {

            throw new Error(
                data?.error ||
                `Server error (${response.status})`
            );
        }


        if (!data.uploadUrl) {

            throw new Error(
                "Server did not return an upload URL."
            );
        }


        if (!data.accessCode) {

            throw new Error(
                "Server did not return an access code."
            );
        }


        // ========================================
        // STEP 2
        // Upload directly to B2
        // ========================================

        status.textContent =
            "Uploading...";


        await uploadToB2(
            data.uploadUrl,
            file,
            progressBar
        );


        // ========================================
        // STEP 3
        // Upload complete
        // ========================================

        progressBar.style.width = "100%";

        status.textContent =
            "Upload complete";


        // ========================================
        // ACCESS CODE
        // ========================================

        const codeBox =
            document.createElement("div");

        codeBox.className =
            "access-code";


        const label =
            document.createElement("span");

        label.textContent =
            "ACCESS CODE";


        const code =
            document.createElement("strong");

        code.textContent =
            data.accessCode;


        const expiry =
            document.createElement("small");

        expiry.textContent =
            "Valid for 30 days";


        codeBox.appendChild(label);
        codeBox.appendChild(code);
        codeBox.appendChild(expiry);


        item.appendChild(codeBox);


        // ========================================
        // SUCCESS TOAST
        // ========================================

        showToast(
            `Upload complete • Code: ${data.accessCode}`,
            "success"
        );

    } catch (error) {

        progressBar.style.width =
            "0%";


        status.textContent =
            "Upload failed";


        showToast(
            getUploadErrorMessage(error),
            "error"
        );
    }
}


// ========================================
// DIRECT B2 UPLOAD
// ========================================

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


            // IMPORTANT:
            // Must match the Content-Type
            // used while creating the signed URL.

            xhr.setRequestHeader(
                "Content-Type",
                file.type ||
                "application/octet-stream"
            );


            // ========================================
            // PROGRESS
            // ========================================

            xhr.upload.addEventListener(
                "progress",
                (event) => {

                    if (!event.lengthComputable) {
                        return;
                    }


                    const percentage =
                        (event.loaded / event.total) * 100;


                    progressBar.style.width =
                        `${percentage}%`;
                }
            );


            // ========================================
            // SUCCESS
            // ========================================

            xhr.addEventListener(
                "load",
                () => {

                    if (
                        xhr.status >= 200 &&
                        xhr.status < 300
                    ) {

                        resolve();

                    } else {

                        reject(
                            new Error(
                                `B2 upload failed (${xhr.status})`
                            )
                        );
                    }
                }
            );


            // ========================================
            // NETWORK / CORS ERROR
            // ========================================

            xhr.addEventListener(
                "error",
                () => {

                    reject(
                        new Error(
                            "Could not connect to Backblaze B2. Check B2 CORS settings."
                        )
                    );
                }
            );


            // ========================================
            // ABORT
            // ========================================

            xhr.addEventListener(
                "abort",
                () => {

                    reject(
                        new Error(
                            "Upload was cancelled."
                        )
                    );
                }
            );


            // ========================================
            // TIMEOUT
            // ========================================

            xhr.timeout =
                30 * 60 * 1000;


            xhr.addEventListener(
                "timeout",
                () => {

                    reject(
                        new Error(
                            "Upload timed out."
                        )
                    );
                }
            );


            xhr.send(file);
        }
    );
}


// ========================================
// DOWNLOAD
// ========================================

if (
    downloadButton &&
    downloadCode
) {

    downloadButton.addEventListener(
        "click",
        downloadFile
    );


    downloadCode.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Enter") {
                downloadFile();
            }
        }
    );
}


// ========================================
// DOWNLOAD FUNCTION
// ========================================

async function downloadFile() {

    const accessCode =
        downloadCode.value.trim();


    // ========================================
    // VALIDATE CODE
    // ========================================

    if (!/^\d{4}$/.test(accessCode)) {

        downloadStatus.textContent =
            "Enter a valid 4-digit code.";

        showToast(
            "Enter a valid 4-digit access code.",
            "error"
        );

        return;
    }


    downloadButton.disabled =
        true;


    downloadStatus.textContent =
        "Preparing download...";


    try {

        // ========================================
        // ASK RENDER FOR DOWNLOAD URL
        // ========================================

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


        let data = null;


        try {
            data = await response.json();
        } catch {
            data = null;
        }


        if (!response.ok) {

            throw new Error(
                data?.error ||
                `Download failed (${response.status})`
            );
        }


        if (!data.downloadUrl) {

            throw new Error(
                "Server did not return a download URL."
            );
        }


        // ========================================
        // START DOWNLOAD
        // ========================================

        downloadStatus.textContent =
            `Starting ${data.fileName}...`;


        const link =
            document.createElement("a");


        link.href =
            data.downloadUrl;


        link.download =
            data.fileName ||
            "download";


        link.target =
            "_blank";


        link.rel =
            "noopener";


        link.style.display =
            "none";


        document.body.appendChild(link);


        link.click();


        link.remove();


        downloadStatus.textContent =
            "Download started.";


        showToast(
            "Download started.",
            "success"
        );


    } catch (error) {

        downloadStatus.textContent =
            error.message;


        showToast(
            error.message,
            "error"
        );

    } finally {

        downloadButton.disabled =
            false;
    }
}


// ========================================
// UPLOAD ERROR MESSAGE
// ========================================

function getUploadErrorMessage(error) {

    const message =
        error?.message || "";


    if (
        message.includes("CORS") ||
        message.includes("Backblaze") ||
        message.includes("B2")
    ) {

        return (
            "Upload blocked by B2 CORS. " +
            "Add your Cloudflare Pages domain to the B2 CORS rules."
        );
    }


    if (
        message.includes("Failed to fetch")
    ) {

        return (
            "Unable to reach the upload server."
        );
    }


    return (
        message ||
        "Upload failed. Please try again."
    );
}


// ========================================
// TOAST SYSTEM
// ========================================

function showToast(
    message,
    type = "info"
) {

    const toast =
        document.createElement("div");


    toast.className =
        `toast toast-${type}`;


    toast.textContent =
        message;


    document.body.appendChild(toast);


    requestAnimationFrame(() => {

        toast.classList.add(
            "toast-visible"
        );
    });


    setTimeout(() => {

        toast.classList.remove(
            "toast-visible"
        );


        setTimeout(() => {
            toast.remove();
        }, 300);

    }, 4000);
}


// ========================================
// FILE SIZE
// ========================================

function formatFileSize(bytes) {

    if (bytes === 0) {
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
        Math.pow(1024, index)
    ).toFixed(2) +
        " " +
        units[index];
}