import dotenv from "dotenv";
dotenv.config({ quiet: true });

import app from "./app/app";
import connectDB from "./config/config";

import startGmailFetcherJob from "./jobs/gmailFetcher.jobs";

// TODO: Add https protocol

const host: string = process.env.HOST || 'localhost';
const port: number = Number(process.env.PORT) || 3000;
const origin: string = process.env.BACKEND_ORIGIN!;

const runJobs = async () => {
    setTimeout(() => {
        startGmailFetcherJob();
    }, 5000);
};

(() => {
    app.listen(port!, host!, async () => {
        await connectDB();
        console.log(`SERVER listening to -> ${origin} \n`);
        runJobs();
    });
})();