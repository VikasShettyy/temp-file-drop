import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand
} from "@aws-sdk/client-s3";

import {
    getSignedUrl
} from "@aws-sdk/s3-request-presigner";


const s3 = new S3Client({
    endpoint: process.env.B2_ENDPOINT,

    region: "us-east-005",

    credentials: {
        accessKeyId: process.env.B2_KEY_ID,
        secretAccessKey: process.env.B2_APPLICATION_KEY
    }
});


const bucket = process.env.B2_BUCKET_NAME;


// ============================================================
// CREATE UPLOAD URL
// ============================================================

export async function createUploadUrl(
    storageKey,
    contentType
) {

    const command = new PutObjectCommand({

        Bucket: bucket,

        Key: storageKey,

        ContentType:
            contentType ||
            "application/octet-stream"
    });


    return getSignedUrl(
        s3,
        command,
        {
            expiresIn: 15 * 60
        }
    );
}



// ============================================================
// CREATE DOWNLOAD URL
// ============================================================

export async function createDownloadUrl(
    storageKey,
    fileName
) {

    /*
     * Prevent a filename from injecting quotes/newlines
     * into the Content-Disposition header.
     */
    const safeFileName =
        String(fileName || "download")
            .replace(/[\r\n"]/g, "")
            .replace(/[\\/:*?<>|]/g, "_");


    const command = new GetObjectCommand({

        Bucket: bucket,

        Key: storageKey,

        /*
         * IMPORTANT
         *
         * This tells the browser:
         *
         * "Download this file instead of displaying it."
         */
        ResponseContentDisposition:
            `attachment; filename="${safeFileName}"`
    });


    return getSignedUrl(
        s3,
        command,
        {
            expiresIn: 5 * 60
        }
    );
}



// ============================================================
// DELETE FILE
// ============================================================

export async function deleteFile(
    storageKey
) {

    const command =
        new DeleteObjectCommand({

            Bucket: bucket,

            Key: storageKey
        });


    await s3.send(command);
}