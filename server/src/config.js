import "dotenv/config";

export const config = {
    port: Number(process.env.PORT || 3000),

    host:
        process.env.HOST || "0.0.0.0",

    nodeEnv:
        process.env.NODE_ENV || "development",

    clientUrl:
        process.env.CLIENT_URL ||
        "https://temp-file-drop.pages.dev",

    b2KeyId:
        process.env.B2_KEY_ID,

    b2ApplicationKey:
        process.env.B2_APPLICATION_KEY,

    b2BucketName:
        process.env.B2_BUCKET_NAME,

    b2Endpoint:
        process.env.B2_ENDPOINT
};