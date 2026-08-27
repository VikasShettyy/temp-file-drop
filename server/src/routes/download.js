import { hashAccessCode }
    from "../security.js";

import {
    createDownloadUrl
} from "../storage.js";

import { pool }
    from "../database.js";


export default async function downloadRoutes(app) {

    app.post(
        "/api/download/init",
        async (request, reply) => {

            try {

                const {
                    accessCode
                } = request.body ?? {};


                // --------------------------------
                // Validate code
                // --------------------------------

                if (
                    typeof accessCode !== "string" ||
                    !/^\d{4}$/.test(accessCode)
                ) {

                    return reply.code(400).send({
                        error:
                            "Invalid access code"
                    });

                }


                // --------------------------------
                // Hash code
                // --------------------------------

                const codeHash =
                    hashAccessCode(accessCode);


                // --------------------------------
                // Find file
                // --------------------------------

                const result =
                    await pool.query(
                        `
                        SELECT
                            id,
                            storage_key,
                            original_name,
                            mime_type,
                            file_size,
                            expires_at
                        FROM files
                        WHERE code_hash = $1
                        LIMIT 1
                        `,
                        [codeHash]
                    );


                if (
                    result.rows.length === 0
                ) {

                    return reply.code(404).send({
                        error:
                            "Invalid access code"
                    });

                }


                const file =
                    result.rows[0];


                // --------------------------------
                // Check expiration
                // --------------------------------

                if (
                    new Date(file.expires_at)
                    <= new Date()
                ) {

                    return reply.code(410).send({
                        error:
                            "This file has expired"
                    });

                }


                // --------------------------------
                // Generate signed B2 URL
                // --------------------------------

                const downloadUrl =
                    await createDownloadUrl(
                        file.storage_key,
                        file.original_name
                    );


                // --------------------------------
                // Return information
                // --------------------------------

                return reply.code(200).send({

                    fileId:
                        file.id,

                    fileName:
                        file.original_name,

                    fileSize:
                        file.file_size,

                    mimeType:
                        file.mime_type,

                    expiresAt:
                        file.expires_at,

                    downloadUrl

                });

            } catch (error) {

                console.error(
                    "Download initialization failed:",
                    error
                );

                return reply.code(500).send({
                    error:
                        "Unable to generate download link"
                });

            }

        }
    );
}