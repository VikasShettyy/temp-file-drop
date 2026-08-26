import { buildApp } from "./app.js";
import { config } from "./config.js";

const app = buildApp();

try {
    await app.listen({
        port: config.port,
        host: config.host
    });
} catch {
    process.exit(1);
}