import settingsOps from "../controllers/settings.controllers";
import emailOps from "../controllers/email.controllers";
import { handleErrorUtil } from "../utils/errors.utils";
import orchAPIs from "../apis/orch.apis";
import globals from "../globals/globals";
import logger from "../utils/logger.utils";

const filePath = '/src/jobs/summaryFetcher.jobs.ts';
const delay = 60 * 60 * 1000;

const main = async (email: string, cachedDate: string) => {
    try {
        const date = new Date();
        const today = `${date.getDate()}/${date.toLocaleString("en-US", { month: "long" })}/${date.getFullYear()}`

        if (today === cachedDate) {
            globals.summarizingJobRunning = false;
            return;
        }

        date.setDate(date.getDate() - 1);
        // settingsOps.add('date', today);
        // globals.date = today
        const emails = await emailOps.fetchEmailsDate(
            email,
            String(date.getDate()),
            date.toLocaleString("en-US", { month: "long" }),
            String(date.getFullYear())
        );
        if (!emails || emails.length === 0) return;

        const summary = await orchAPIs.summarize(emails);

        console.log(summary);
        // summary db operations
    } catch (err) {
        handleErrorUtil(filePath, 'main', err, 'Fetching summary / Calling OL Api');
    }
};

const startSummaryFetcher = async () => {
    try {
        if (globals.summarizingJobRunning === true) return;
        logger.info('Gmail Summarizer Job running');
        globals.summarizingJobRunning = true;

        if (!globals.userGmail) {
            globals.userGmail = await settingsOps.find('email');
        }
        if (!globals.userGmail) throw Error('Email was not known to run background jobs');

        if (!globals.date) {
            globals.date = await settingsOps.find('date');
        }
        if (!globals.date) throw Error('Date was not known to run background jobs');


        const email = globals.userGmail;
        const cachedDate = globals.date;

        await main(email, cachedDate);
        setInterval(async () => {
            await main(email, cachedDate);
        }, delay);
    } catch (err) {
        logger.warn('Gmail Summarizer Job Stopped');
        globals.summarizingJobRunning = false;
        handleErrorUtil(filePath, 'summaryFetcher', err, 'Starting Gmail Fetcher Job');
    }
};

export default startSummaryFetcher;