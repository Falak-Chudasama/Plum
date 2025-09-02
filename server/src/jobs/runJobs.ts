import settingsOps from "../controllers/settings.controllers";
import globals from "../globals/globals";
import logger from "../utils/logger.utils";
import { OAuthObjectCheck } from "../middlewares/googleAuth.middlewares";
import startGmailFetcherJob from "./gmailFetcher.jobs";
import startSummaryFetcher from "./summaryFetcher.jobs";
import utils from "../utils/utils";

const delay = 10 * 60 * 1000;

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

    await startGmailFetcherJob();
    await startSummaryFetcher();
    setInterval(async () => {
        if (globals.gmailFetcherJobRunning === false) {
            await startGmailFetcherJob();
        }
        if (globals.summarizingJobRunning === false) {
            await startSummaryFetcher();
        }

    }, delay);
    const { seconds, minutes, hours, day, month, year } = utils.getToday();
    await settingsOps.add('date', `${day}/${month}/${year}`);
    await settingsOps.add('time', `${hours}:${minutes}:${seconds}`);
};

export default runJobs;