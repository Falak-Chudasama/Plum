import settingsOps from "../controllers/settings.controllers";
import emailOps from "../controllers/email.controllers";
import categoryOps from "../controllers/category.controllers";
import { OAuthObjectCheck } from "../middlewares/googleAuth.middlewares";
import { handleErrorUtil } from "../utils/errors.utils";
import orchAPIs from "../apis/orch.apis";
import globals from "../globals/globals";
import logger from "../utils/logger.utils";

const filePath = '/src/jobs/gmailFetcher.jobs.ts';
const delay = 2 * 60 * 1000;
const n = 10;

const main = async (email: string, OAuth: any) => {
    try {
        const emails = await emailOps.fetchEmailsUtil(OAuth, n);
        const uniqueEmails = await emailOps.fetchUniqueEmails(emails);

        for (let uniqueEmail of uniqueEmails) {
            uniqueEmail.email = email;
        }

        if (uniqueEmails.length === 0) {
            logger.info(`Detected 0 new inbox mails`);
            return;
        }

        logger.info(`Detected ${uniqueEmails.length} new inbox mails`);

        const categories = await categoryOps.find();

        const categorizedEmails = await orchAPIs.categorize(uniqueEmails, categories);
        if (!categorizedEmails) throw Error('Emails were not categorized - Make sure Orch is running');
        
        const result = await emailOps.saveInboundEmails(categorizedEmails.emails);
        logger.info(`Saved Categorized Emails: ${result}`);
    } catch (err) {
        handleErrorUtil(filePath, 'main', err, 'Fetching mails / Calling OL Api');
    }
};

const startGmailFetcherJob = async () => {
    try {
        if (globals.gmailFetcherJobRunning) return;
        logger.info('Gmail Fetcher Job running');
        globals.gmailFetcherJobRunning = true;
        
        if (!globals.userGmail) {
            globals.userGmail = await settingsOps.find('email');
        }
        
        const email = globals.userGmail;
        if (!email) throw Error('Email was not known to run background jobs');
        
        await OAuthObjectCheck(email);
        await main(email, globals.OAuthObject!);
        setInterval(async () => {
            await main(email, globals.OAuthObject!);
        }, delay);
    } catch (err) {
        logger.warn('Gmail Fetcher Job Stopped');
        globals.gmailFetcherJobRunning = false;
        handleErrorUtil(filePath, 'startGmailFetcherJob', err, 'Starting Gmail Fetcher Job');
    }
};

export default startGmailFetcherJob;