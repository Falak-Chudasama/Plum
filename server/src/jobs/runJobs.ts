import logger from "../utils/logger.utils";
import startGmailFetcherJob from "./gmailFetcher.jobs";

const runJobs = async () => {
    logger.info("[Jobs] Initializing background jobs");
    try {
        await startGmailFetcherJob();
        logger.info("[Jobs] Background jobs successfully initialized");
    } catch (err: any) {
        logger.error(`[Jobs] Failed to initialize background jobs: ${err?.message || err}`);
    }
};

export default runJobs;
