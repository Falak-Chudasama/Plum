import settingsOps from "../controllers/settings.controllers";
import emailOps from "../controllers/email.controllers";
import { handleErrorUtil } from "../utils/errors.utils";
import orchAPIs from "../apis/orch.apis";
import globals from "../globals/globals";
import logger from "../utils/logger.utils";
import summaryOps from "../controllers/summary.controllers";
import utils from "../utils/utils";

const filePath = '/src/jobs/summaryFetcher.jobs.ts';
const delay = 60 * 60 * 1000;

const main = async () => {
    try {
        const email = globals.email!;
        const cachedDate = globals.date!;
        
        const { day, month, year } = utils.getToday();
        const today = `${day}/${month}/${year}`;
        
        if (today === cachedDate) {
            logger.info('Summary is Up to Date');
            return;
        }
        const date = new Date();
        date.setDate(date.getDate() - 1);
        const emails = await emailOps.fetchEmailsDate(
            email,
            String(date.getDate()),
            date.toLocaleString("en-US", { month: "long" }),
            String(date.getFullYear())
        );
        if (!emails || emails.length === 0) {
            globals.summarizingJobRunning = false;
            return;
        };

        const response = await orchAPIs.summarize(emails);
        if (response && response.success) {
            const { summary } = response;
            await summaryOps.create(email, summary);
            globals.date = today;
            logger.info(`Saved Summary Length: ${summary.length}`);
        } else {
            throw Error('Failed to get Summary');
        }
    } catch (err) {
        handleErrorUtil(filePath, 'main', err, 'Fetching summary / Calling OL Api');
    }
};

const startSummaryFetcher = async () => {
    try {
        if (globals.summarizingJobRunning === true) return;
        logger.info('Gmail Summarizer Job running');
        globals.summarizingJobRunning = true;

        await main();
        setInterval(async () => {
            await main();
        }, delay);
    } catch (err) {
        logger.warn('Gmail Summarizer Job Stopped');
        globals.summarizingJobRunning = false;
        handleErrorUtil(filePath, 'summaryFetcher', err, 'Starting Gmail Fetcher Job');
    }
};

export default startSummaryFetcher;