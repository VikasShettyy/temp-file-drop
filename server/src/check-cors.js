import "dotenv/config";
import {
    S3Client,
    GetBucketCorsCommand
} from "@aws-sdk/client-s3";

const client = new S3Client({
    endpoint: process.env.B2_ENDPOINT,
    region: "us-east-005",
    credentials: {
        accessKeyId: process.env.B2_KEY_ID,
        secretAccessKey: process.env.B2_APPLICATION_KEY
    }
});

try {
    const result = await client.send(
        new GetBucketCorsCommand({
            Bucket: process.env.B2_BUCKET_NAME
        })
    );

    console.log(JSON.stringify(result.CORSRules, null, 2));
} catch (error) {
    console.error("CORS CHECK FAILED:");
    console.error(error);
}