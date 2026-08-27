import "dotenv/config";
import B2 from "backblaze-b2";

const b2 = new B2({
    applicationKeyId: process.env.B2_KEY_ID,
    applicationKey: process.env.B2_APPLICATION_KEY
});

const bucketId = "3a004cd290c634e7ad090e1e";

const corsRules = [
    {
        corsRuleName: "temp-file-drop",

        allowedOrigins: [
            "https://temp-file-drop.pages.dev",
            "http://localhost:5500"
        ],

        allowedHeaders: [
            "*"
        ],

        allowedOperations: [
            "s3_put_object",
            "s3_get_object",
            "s3_head_object"
        ],

        exposeHeaders: [
            "ETag",
            "Content-Length",
            "Content-Type"
        ],

        maxAgeSeconds: 3600
    }
];


async function main() {

    console.log("Authorizing with Backblaze...");

    const auth = await b2.authorize();

    console.log("Authorized.");
    console.log("Account ID:", auth.data.accountId);

    console.log("\nUpdating S3 CORS rules...");

    console.log(
        JSON.stringify(corsRules, null, 2)
    );

    const result = await b2.updateBucket({

        accountId:
            auth.data.accountId,

        bucketId,

        bucketType:
            "allPrivate",

        corsRules
    });

    console.log(
        "\n================================="
    );

    console.log(
        "CORS UPDATED SUCCESSFULLY"
    );

    console.log(
        "================================="
    );

    console.log(
        JSON.stringify(
            result.data,
            null,
            2
        )
    );
}


main().catch(error => {

    console.error(
        "\n================================="
    );

    console.error("ERROR");

    console.error(
        "================================="
    );

    console.error(
        error.response?.data ||
        error.message ||
        error
    );

    process.exit(1);
});