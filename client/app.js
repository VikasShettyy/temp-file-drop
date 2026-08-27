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

const downloadCode =
    document.getElementById("downloadCode");

const downloadButton =
    document.getElementById("downloadButton");

const downloadStatus =
    document.getElementById("downloadStatus");


// ========================================
// SELECT FILES
// ========================================

selectButton.addEventListener("click", () => {
    fileInput.click();
});


// ========================================
// FILE PICKER
// ========================================

fileInput.addEventListener("change", () => {

    handleFiles(fileInput.files);

    // Allow selecting the same file again
    fileInput.value = "";
});


// ========================================
// DRAG OVER
// ========================================

dropZone.addEventListener("dragover", (event) => {

    event.preventDefault();

    dropZone.classList.add("dragging");
});


// ========================================
// DRAG LEAVE
// ========================================

dropZone.addEventListener("dragleave", () => {

    dropZone.classList.remove("dragging");
});


// ========================================
// DROP
// ========================================

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

    for (const file of files) {

        await uploadFile(file);
    }
}


// ========================================
// UPLOAD FILE
// ========================================

async function uploadFile(file) {

    const item =
        document.createElement("div");

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
        // Ask Render backend for signed upload URL
        // ========================================

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
                        fileName: file.name,
                        fileSize: file.size,
                        mimeType:
                            file.type ||
                            "application/octet-stream"
                    })
                }
            );


        let initData = null;

        try {
            initData =
                await initResponse.json();
        } catch {
            initData = null;
        }


        if (!initResponse.ok) {

            throw new Error(
                initData?.error ||
                `Server error (${initResponse.status})`
            );
        }


        if (!initData.uploadUrl) {

            throw new Error(
                "Server did not return an upload URL."
            );
        }


        if (!initData.accessCode) {

            throw new Error(
                "Server did not return an access code."
            );
        }


        // ========================================
        // STEP 2
        // Direct upload to Backblaze B2
        // ========================================

        status.textContent =
            "Uploading...";


        await uploadToB2(
            initData.uploadUrl,
            file,
            progressBar
        );


        // ========================================
        // STEP 3
        // Upload complete
        // ========================================

        progressBar.style.width =
            "100%";


        status.textContent =
            "Upload complete";


        // ========================================
        // ACCESS CODE
        // ========================================

        const code =
            document.createElement("div");

        code.className =
            "access-code";


        const codeLabel =
            document.createElement("span");

        codeLabel.textContent =
            "ACCESS CODE";


        const codeValue =
            document.createElement("strong");

        codeValue.textContent =
            initData.accessCode;


        const codeExpiry =
            document.createElement("small");

        codeExpiry.textContent =
            "Valid for 30 days";


        code.appendChild(codeLabel);
        code.appendChild(codeValue);
        code.appendChild(codeExpiry);


        item.appendChild(code);


        // ========================================
        // TOAST
        // ========================================

        showToast(
            `Upload complete • Code: ${initData.accessCode}`,
            "success"
        );


    } catch (error) {

        console.error(
            "Upload failed:",
            error
        );


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
// UPLOAD TO BACKBLAZE B2
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


            // ====================================
            // Open PUT request
            // ====================================

            xhr.open(
                "PUT",
                uploadUrl,
                true
            );


            // ====================================
            // IMPORTANT
            // Must match the ContentType used
            // while creating the signed URL.
            // ====================================

            xhr.setRequestHeader(
                "Content-Type",
                file.type ||
                "application/octet-stream"
            );


            // ====================================
            // Upload progress
            // ====================================

            xhr.upload.addEventListener(
                "progress",
                (event) => {

                    if (!event.lengthComputable) {
                        return;
                    }


                    const percentage =
                        (
                            event.loaded /
                            event.total
                        ) * 100;


                    progressBar.style.width =
                        `${percentage}%`;
                }
            );


            // ====================================
            // Successful response
            // ====================================

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


            // ====================================
            // Network / CORS error
            // ====================================

            xhr.addEventListener(
                "error",
                () => {

                    reject(
                        new Error(
                            "Could not connect to Backblaze B2. Check your B2 CORS configuration."
                        )
                    );
                }
            );


            // ====================================
            // Upload cancelled
            // ====================================

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


            // ====================================
            // Timeout
            // ====================================

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


            // ====================================
            // Start upload
            // ====================================

            xhr.send(file);
        }
    );
}


// ========================================
// DOWNLOAD
// ========================================

downloadButton.addEventListener(
    "click",
    downloadFile
);


// ========================================
// DOWNLOAD FUNCTION
// ========================================

async function downloadFile() {

    const accessCode =
        downloadCode.value.trim();


    // ========================================
    // Validate code
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

        // ====================================
        // Ask Render for signed download URL
        // ====================================

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

            data =
                await response.json();

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


        downloadStatus.textContent =
            `Downloading ${data.fileName}...`;


        // ====================================
        // Create temporary download link
        // ====================================

        const link =
            document.createElement("a");


        link.href =
            data.downloadUrl;


        link.download =
            data.fileName ||
            "download";


        link.target =
            "_self";


        link.style.display =
            "none";


        document.body.appendChild(link);


        link.click();


        link.remove();


        // ====================================
        // Success
        // ====================================

        downloadStatus.textContent =
            "Download started.";


        showToast(
            "Download started.",
            "success"
        );


    } catch (error) {

        console.error(
            "Download failed:",
            error
        );


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
        message.includes("connect to Backblaze")
    ) {

        return (
            "Upload blocked by B2 CORS. " +
            "Check your Backblaze bucket CORS rules."
        );
    }


    if (
        message.includes("Failed to fetch")
    ) {

        return (
            "Unable to reach the upload server."
        );
    }


    return message ||
        "Upload failed. Please try again.";
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


    // Trigger animation
    requestAnimationFrame(() => {

        toast.classList.add(
            "toast-visible"
        );
    });


    // Remove after 4 seconds
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
// FORMAT FILE SIZE
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