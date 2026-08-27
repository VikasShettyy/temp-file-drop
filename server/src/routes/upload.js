import {
    generateAccessCode,
    hashAccessCode,
    generateFileId,
    generateStorageKey
} from "../security.js";

import {
    createUploadUrl
} from "../storage.js";

import { pool } from "../database.js";


export default async function uploadRoutes(app) {

    app.post(
        "/api/upload/init",
        async (request, reply) => {

            try {

                const {
                    fileName,
                    fileSize,
                    mimeType
                } = request.body || {};


                // --------------------------------
                // Validate file name
                // --------------------------------

                if (
                    typeof fileName !== "string" ||
                    fileName.trim().length === 0 ||
                    fileName.length > 255
                ) {

                    return reply.code(400).send({
                        error: "Invalid file name"
                    });

                }


                // --------------------------------
                // Validate file size
                // --------------------------------

                if (
                    !Number.isSafeInteger(fileSize) ||
                    fileSize <= 0
                ) {

                    return reply.code(400).send({
                        error: "Invalid file size"
                    });

                }


                // --------------------------------
                // Generate file information
                // --------------------------------

                const fileId =
                    generateFileId();

                const storageKey =
                    generateStorageKey(fileId);

                const accessCode =
                    generateAccessCode();

                const codeHash =
                    hashAccessCode(accessCode);


                // --------------------------------
                // Expiration
                // --------------------------------

                const expiresAt =
                    new Date(
                        Date.now() +
                        30 * 24 * 60 * 60 * 1000
                    );


                // --------------------------------
                // Create B2 upload URL
                // --------------------------------

                const uploadUrl =
                    await createUploadUrl(
                        storageKey,
                        mimeType
                    );


                // --------------------------------
                // Store metadata
                // --------------------------------

                await pool.query(
                    `
                    INSERT INTO files (
                        id,
                        storage_key,
                        original_name,
                        mime_type,
                        file_size,
                        code_hash,
                        expires_at
                    )
                    VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7
                    )
                    `,
                    [
                        fileId,
                        storageKey,
                        fileName,
                        mimeType || null,
                        fileSize,
                        codeHash,
                        expiresAt
                    ]
                );


                // --------------------------------
                // Return upload information
                // --------------------------------

                return reply.code(200).send({

                    fileId,

                    uploadUrl,

                    accessCode,

                    expiresAt

                });

            } catch (error) {

                console.error(
                    "Upload initialization failed:",
                    error
                );

                return reply.code(500).send({
                    error:
                        "Unable to initialize upload"
                });

            }

        }
    );
}