import dotenv from "dotenv";
dotenv.config({ quiet: true })

import app from "./app/app";
import connectDB from "./config/config";

import logger from "./utils/logger.utils";
import runJobs from "./jobs/runJobs";

const host: string = process.env.HOST || 'localhost';
const port: number = Number(process.env.PORT) || 3000;
const origin: string = process.env.BACKEND_ORIGIN!;

(() => {
    app.listen(port!, host!, async () => {
        try {
            await import('./sockets/client.socket');
            await import('./sockets/orchestration.socket');
        } catch (err) {
            console.error('Failed to import and load socket servers: ' + err);
        }
        await connectDB();
        logger.info(`SERVER listening to -> ${origin} \n`);
        runJobs();
    });
})();