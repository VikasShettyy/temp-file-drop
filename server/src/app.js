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


    // --------------------------------
    // Security headers
    // --------------------------------

    app.register(helmet);


    // --------------------------------
    // CORS
    // --------------------------------

    app.register(cors, {

        origin: config.clientUrl,

        methods: [
            "GET",
            "POST",
            "OPTIONS"
        ]

    });


    // --------------------------------
    // Rate limiting
    // --------------------------------

    app.register(rateLimit, {

        max: 100,

        timeWindow: "1 minute"

    });


    // --------------------------------
    // Health check
    // --------------------------------

    app.get(
        "/api/health",
        async () => {

            return {
                status: "ok"
            };

        }
    );


    // --------------------------------
    // Routes
    // --------------------------------

    app.register(uploadRoutes);

    app.register(downloadRoutes);


    return app;
}