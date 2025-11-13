import settingsOps from "../controllers/settings.controllers";
import globals from "../globals/globals";
import logger from "../utils/logger.utils";
import { OAuthObjectCheck } from "../middlewares/googleAuth.middlewares";
import startGmailFetcherJob from "./gmailFetcher.jobs";
import startCategoriesFeedingJob from "./categoriesFeedingJob.jobs";
import startIntentsFeedingJob from "./intentFeedingJob.jobs";
import utils from "../utils/utils";
import userOps from "../controllers/user.controllers";

const minutesDelay = 10;
const delay = minutesDelay * 60 * 1000;

const runJobs = async () => {
    logger.info('Running Jobs');

    const email = await settingsOps.find('email');
    const date = await settingsOps.find('date');
    const time = await settingsOps.find('time');
    
    if (!email || !date || !time) {
        throw Error('Failed to fetch settings from DB');
    } else {
        const user = await userOps.findUserUtil(email);
        globals.userFn = user?.name!;
        globals.userLn = user?.lastName!;
    }


    globals.email = email;
    globals.date = date;
    globals.time = time;

    await OAuthObjectCheck(email);
    logger.info(`Waiting ${minutesDelay} minutes...`);
    await startCategoriesFeedingJob();
    await startIntentsFeedingJob();
    setInterval(async () => {
        try {
            if (globals.categoriesFeedingJobRunning === false) {
                await startCategoriesFeedingJob();
            }
            if (globals.gmailFetcherJobRunning === false) {
                await startGmailFetcherJob();
            }
            if (globals.intentsFeedingJobRunning === false) {
                await startIntentsFeedingJob();
            }
            const { seconds, minutes, hours, day, month, year } = utils.getToday();
            await settingsOps.add('date', `${day}/${month}/${year}`);
            await settingsOps.add('time', `${hours}:${minutes}:${seconds}`);
        } catch (err) {
            logger.warn('Jobs were not run properly, will retry');
            logger.error(err);
        }
        logger.info(`Waiting ${minutesDelay} minutes for jobs refreshment...`);
    }, delay);
};

export default runJobs;