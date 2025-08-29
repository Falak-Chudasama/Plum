import globals from "../globals/globals";
import logger from "../utils/logger.utils";
import startGmailFetcherJob from "./gmailFetcher.jobs";
import startSummaryFetcher from "./summaryFetcher.jobs";

// const delay = 2 * 60 * 1000;
const delay = 1000;

const runJobs = async () => {
    logger.info('Running Jobs');

    setInterval(async () => {
        if (globals.gmailFetcherJobRunning === false) {
            await startGmailFetcherJob();
        }
        if (globals.summarizingJobRunning === false) {
            startSummaryFetcher();
        }
    }, delay);
};

export default runJobs;