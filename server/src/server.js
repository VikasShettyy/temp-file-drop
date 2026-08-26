import { buildApp } from "./app.js";
import { config } from "./config.js";

const app = buildApp();

try {

    await app.listen({
        port: config.port,
        host: config.host
    });

    console.log(
        `Server running on port ${config.port}`
    );

} catch (error) {

    console.error("SERVER STARTUP FAILED");
    console.error(error);

    process.exit(1);
}