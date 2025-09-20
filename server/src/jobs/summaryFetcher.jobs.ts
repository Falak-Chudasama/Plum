import emailOps from "../controllers/email.controllers";
import { handleErrorUtil } from "../utils/errors.utils";
import orchAPIs from "../apis/orch.apis";
import globals from "../globals/globals";
import logger from "../utils/logger.utils";
import summaryOps from "../controllers/summary.controllers";
import utils from "../utils/utils";

const filePath = '/src/jobs/summaryFetcher.jobs.ts';
const delay = 10 * 60 * 1000;
let mainIsRunning = false;

const main = async () => {
    mainIsRunning = true;
    try {
        logger.info('C Job. Gmail Summarizer Job Running');
        const email = globals.email!;
        const cachedDate = globals.date!;
        
        const { day, month, year } = utils.getToday();
        const today = `${day}/${month}/${year}`;
        
        if (today === cachedDate) {
            logger.info('C Job. Summary is Up to Date');
            return;
        }
        const date = new Date();
        date.setDate(date.getDate() - 1);
        const emails = await emailOps.fetchEmailsDate(
            email,
            (String(date.getDate())).padStart(2, '0'),
            date.toLocaleString("en-US", { month: "long" }),
            String(date.getFullYear())
        );
        if (!emails || emails.length === 0) {
            mainIsRunning = false;
            return;
        };
        
        const response = await orchAPIs.summarize(emails);
        if (response && response.success) {
            const { summary } = response;
            await summaryOps.create(email, summary);
            globals.date = today;
            logger.info(`C Job. Saved Summary Length: ${summary.length}`);
        } else {
            throw Error('Failed to get Summary');
        }
        logger.info('C Job. Gmail Summarizer Job Finished');
    } catch (err) {
        mainIsRunning = false;
        logger.warn('C Job. Gmail Summarizer Job Stopped');
        handleErrorUtil(filePath, 'main', err, 'Fetching summary / Calling OL Api');
        throw Error(err);
    }
    mainIsRunning = false;
};

const startSummaryFetcher = async () => {
    try {
        if (globals.summarizingJobRunning === true) return;
        logger.info('C Loop. Gmail Summarizer Job Loop Running');
        globals.summarizingJobRunning = true;

        if (!mainIsRunning) await main();
        logger.info(`C Loop. Job will begin in ${delay / 60000} minutes...`);
        setInterval(async () => {
            if (!mainIsRunning) await main();
            logger.info(`C Loop. Job will begin in ${delay / 60000} minutes...`);
        }, delay);
    } catch (err) {
        logger.warn('C Loop. Gmail Summarizer Job Loop Stopped');
        globals.summarizingJobRunning = false;
        handleErrorUtil(filePath, 'summaryFetcher', err, 'Starting Gmail Fetcher Job');
        throw Error(err);
    }
};

export default startSummaryFetcher;