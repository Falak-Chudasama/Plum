import dotenv from "dotenv";
dotenv.config({ quiet: true });

import app from "./app/app";
import logger from "./utils/logger.utils";

const PORT = Number(process.env.PORT!);
const HOST = process.env.HOST!;
const ORIGIN = process.env.ORIGIN!;

(async () => {
    try {
        await import('./connections/serverWsClienet');
        console.log("serverWsClienet import complete.");
    } catch (err) {
        console.error("Failed to import serverWsClienet:", err);
    }
    app.listen(PORT, HOST, async () => {
        logger.info(`ORCHESTRATION listening to -> ${ORIGIN} \n`)
    });
})();