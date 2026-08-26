import "dotenv/config";

const {
    B2_KEY_ID,
    B2_APPLICATION_KEY,
    B2_BUCKET_NAME,
    CLIENT_URL
} = process.env;


// --------------------------------------------------
// Validate environment
// --------------------------------------------------

if (!B2_KEY_ID) {
    throw new Error("B2_KEY_ID is missing from .env");
}

if (!B2_APPLICATION_KEY) {
    throw new Error("B2_APPLICATION_KEY is missing from .env");
}

if (!B2_BUCKET_NAME) {
    throw new Error("B2_BUCKET_NAME is missing from .env");
}

if (!CLIENT_URL) {
    throw new Error("CLIENT_URL is missing from .env");
}


// --------------------------------------------------
// Authorize
// --------------------------------------------------

async function authorize() {

    const credentials = Buffer
        .from(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`)
        .toString("base64");

    const response = await fetch(
        "https://api.backblazeb2.com/b2api/v4/b2_authorize_account",
        {
            method: "GET",

            headers: {
                Authorization: `Basic ${credentials}`
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            `Authorization failed: ${response.status} ${JSON.stringify(data)}`
        );
    }

    return data;
}


// --------------------------------------------------
// Main
// --------------------------------------------------

async function main() {

    console.log("Authorizing with Backblaze...");

    const auth = await authorize();

    console.log("Authorized.");

    const apiUrl =
        auth.apiInfo?.storageApi?.apiUrl;

    if (!apiUrl) {
        throw new Error(
            "Backblaze storage API URL was not returned."
        );
    }

    console.log(`Account ID: ${auth.accountId}`);
    console.log(`API URL: ${apiUrl}`);


    // --------------------------------------------------
    // Get bucket information
    //
    // We provide bucketName because the application key
    // may be restricted to this bucket.
    // --------------------------------------------------

    console.log("\nFinding bucket...");

    const listResponse = await fetch(
        `${apiUrl}/b2api/v4/b2_list_buckets`,
        {
            method: "POST",

            headers: {
                Authorization: auth.authorizationToken,
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                accountId: auth.accountId,
                bucketName: B2_BUCKET_NAME
            })
        }
    );

    const listText =
        await listResponse.text();

    if (!listResponse.ok) {

        throw new Error(
            `Failed to get bucket: ${listResponse.status} ${listText}`
        );
    }

    const bucketData =
        JSON.parse(listText);


    if (
        !bucketData.buckets ||
        bucketData.buckets.length === 0
    ) {
        throw new Error(
            `Bucket "${B2_BUCKET_NAME}" was not found.`
        );
    }


    const bucket =
        bucketData.buckets[0];


    console.log(
        `Bucket found: ${bucket.bucketName}`
    );

    console.log(
        `Bucket ID: ${bucket.bucketId}`
    );


    // --------------------------------------------------
    // CORS configuration
    // --------------------------------------------------

    const corsRules = [
        {
            corsRuleName: "temp-file-drop-upload",

            allowedOrigins: [
                CLIENT_URL
            ],

            allowedHeaders: [
                "*"
            ],

            allowedOperations: [
                "s3_put",
                "s3_get",
                "s3_head"
            ],

            exposeHeaders: [
                "ETag"
            ],

            maxAgeSeconds: 3600
        }
    ];


    console.log("\nCORS configuration:");

    console.log(
        JSON.stringify(
            corsRules,
            null,
            2
        )
    );


    // --------------------------------------------------
    // Update CORS
    // --------------------------------------------------

    console.log("\nUpdating bucket CORS...");

    const updateResponse = await fetch(
        `${apiUrl}/b2api/v4/b2_update_bucket`,
        {
            method: "POST",

            headers: {
                Authorization: auth.authorizationToken,
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                accountId: auth.accountId,
                bucketId: bucket.bucketId,
                corsRules
            })
        }
    );


    const updateText =
        await updateResponse.text();


    if (!updateResponse.ok) {

        throw new Error(
            `CORS update failed: ${updateResponse.status} ${updateText}`
        );
    }


    console.log("\n=================================");
    console.log("CORS UPDATED SUCCESSFULLY");
    console.log("=================================\n");

    console.log(updateText);
}


main().catch(error => {

    console.error("\n=================================");
    console.error("ERROR");
    console.error("=================================\n");

    console.error(error.message);

    process.exit(1);
});