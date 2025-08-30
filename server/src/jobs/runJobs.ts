import settingsOps from "../controllers/settings.controllers";
import globals from "../globals/globals";
import logger from "../utils/logger.utils";
import { OAuthObjectCheck } from "../middlewares/googleAuth.middlewares";
import startGmailFetcherJob from "./gmailFetcher.jobs";
import startSummaryFetcher from "./summaryFetcher.jobs";

const delay = 1000;
// const delay = 2 * 60 * 1000;

const runJobs = async () => {
    logger.info('Running Jobs');

    const email = await settingsOps.find('email');
    const date = await settingsOps.find('date');
    const time = await settingsOps.find('time');

    if (!email || !date || !time) {
        throw Error('Failed to fetch settings from DB');
    }

    globals.email = email;
    globals.date = date;
    globals.time = time;

    await OAuthObjectCheck(email);

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