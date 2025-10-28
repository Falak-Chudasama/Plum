import dotenv from "dotenv";
dotenv.config({ quiet: true });

import app from "./app/app";
import connectDB from "./config/config";

import logger from "./utils/logger.utils";
import runJobs from "./jobs/runJobs";

import './sockets/orchestration.socket';
import './sockets/client.socket';

const host: string = process.env.HOST || 'localhost';
const port: number = Number(process.env.PORT) || 3000;
const origin: string = process.env.BACKEND_ORIGIN!;

(() => {
    app.listen(port!, host!, async () => {
        await connectDB();
        logger.info(`SERVER listening to -> ${origin} \n`);
        runJobs();
    });
})();