import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";

import { config } from "./config.js";

import uploadRoutes from "./routes/upload.js";
import downloadRoutes from "./routes/download.js";


export function buildApp() {

    const app = Fastify({
        logger: false
    });


    app.register(helmet);


    app.register(cors, {
        
        origin: config.clientUrl,

        methods: [
            "GET",
            "POST"
        ]
    });


    app.register(rateLimit, {

        max: 100,

        timeWindow: "1 minute"
    });


    app.get(
        "/api/health",
        async () => {

            return {
                status: "ok"
            };
        }
    );


    // Upload
    app.register(uploadRoutes);


    // Download
    app.register(downloadRoutes);


    return app;
}