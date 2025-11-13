import dotenv from "dotenv";
dotenv.config({ quiet: true });

import app from "./app/app";
import logger from "./utils/logger.utils";
import { MongoClient } from "mongodb";
import globals from "./globals/globals";

const PORT = Number(process.env.PORT!);
const HOST = process.env.HOST!;
const ORIGIN = process.env.ORIGIN!;

(async () => {
    try {
        await import('./connections/serverWsClient');
        console.log("serverWsClienet import complete.");
    } catch (err) {
        console.error("Failed to import serverWsClienet:", err);
    }
    app.listen(PORT, HOST, async () => {
        logger.info(`ORCHESTRATION listening to -> ${ORIGIN} \n`);
        const client = new MongoClient(process.env.MONGO_URI!);
        await client.connect();
        globals.mongoClient = client;
        globals.db = client.db(process.env.MONGO_DB_NAME);
    });
})();