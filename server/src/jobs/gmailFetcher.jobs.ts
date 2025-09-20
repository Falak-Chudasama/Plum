import emailOps from "../controllers/email.controllers";
import { handleErrorUtil } from "../utils/errors.utils";
import globals from "../globals/globals";
import logger from "../utils/logger.utils";
import utils from "../utils/utils";
import orchAPIs from "../apis/orch.apis";

const filePath = '/src/jobs/gmailFetcher.jobs.ts';
const delay = 10 * 60 * 1000;
const minN = 10;
let mainIsRunning = false;

const main = async () => {
    mainIsRunning = true;
    try {
        logger.info('B Job. Gmail Fetcher/Categorizator Job Running');
        const n = Math.max(minN, Math.ceil(utils.getMinuteDifference(globals.date!, globals.time!) / 50));
        const emails = await emailOps.fetchEmailsUtil(globals.OAuthObject, n);
        const uniqueEmails = await emailOps.fetchUniqueEmails(emails);
        
        for (let uniqueEmail of uniqueEmails) {
            uniqueEmail.email = globals.email!;
        }
        
        if (uniqueEmails.length === 0) {
            mainIsRunning = false;
            logger.info(`B Job. Detected 0 new inbox mails`);
            return;
        }
        
        logger.info(`B Job. Detected ${uniqueEmails.length} new inbox mails`);

        const categorizedEmails = await orchAPIs.categorize(uniqueEmails);
        if (!categorizedEmails) throw Error('Emails were not categorized - Make sure MS is running');
        
        const result = await emailOps.saveInboundEmails(categorizedEmails);
        logger.info(`B Job. Saved Categorized Emails: ${result.inserted}`);
        logger.info('B Job. Gmail Fetcher/Categorizator Job Finished');
    } catch (err) {
        mainIsRunning = false;
        logger.warn('B Job. Gmail Fetcher/Categorizator Job Stopped');
        handleErrorUtil(filePath, 'main', err, 'Fetching mails / Calling OL Api');
        throw Error(err);
    }
    mainIsRunning = false;
};

const startGmailFetcherJob = async () => {
    try {
        if (globals.gmailFetcherJobRunning) return;
        logger.info('B Loop. Gmail Fetcher/Categorizator Job Loop started');
        globals.gmailFetcherJobRunning = true;

        if (!mainIsRunning) await main();
        logger.info(`B Loop. Job will begin in ${delay / 60000} minutes...`);
        setInterval(async () => {
            if (!mainIsRunning) await main();
            logger.info(`B Loop. Job will begin in ${delay / 60000} minutes...`);
        }, delay);
    } catch (err) {
        logger.warn('B Loop. Gmail Fetcher/Categorizator Job Loop Stopped');
        globals.gmailFetcherJobRunning = false;
        handleErrorUtil(filePath, 'startGmailFetcherJob', err, 'Starting Gmail Fetcher Job');
        throw Error(err);
    }
};

export default startGmailFetcherJob;
export {
    categorize
}