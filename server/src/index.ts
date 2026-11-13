import dotenv from "dotenv";
dotenv.config({ quiet: true });

import app from "./app/app";
import connectDB from "./config/config";
import logger from "./utils/logger.utils";
import runJobs from "./jobs/runJobs";

const host: string = process.env.HOST || "127.0.0.2";
const port: number = Number(process.env.PORT) || 10000;
const origin: string = process.env.BACKEND_ORIGIN || "https://api.plum.jam";

(() => {
    app.listen(port, host, async () => {
        try {
            await import("./sockets/client.socket");
        } catch (err) {
            console.error("Failed to import and load client socket server: " + err);
        }
        await connectDB();
        logger.info(`Plum Server listening at -> ${origin} (${host}:${port})`);
        runJobs();
    });
})();
