import settingsOps from "../controllers/settings.controllers";
import emailOps from "../controllers/email.controllers";
import { OAuthObjectCheck } from "../middlewares/googleAuth.middlewares";
import { handleErrorUtil } from "../utils/errors.utils";
import globals from "../globals/globals";

const filePath = '/src/jobs/gmailFetcher.jobs.ts';
const delay = 15 * 60 * 1000;
const n = 15;

const main = async (OAuth: any) => {
    try {
        const emails = await emailOps.fetchEmailsUtil(OAuth, n);
        const uniqueEmails = await emailOps.fetchUniqueEmails(emails);
    } catch (err) {
        handleErrorUtil(filePath, 'main', err, 'Fetching mails / Calling OL Api');
    }
}

const startGmailFetcherJob = async () => {
    try {
        const email = await settingsOps.find('email');
        if (!email) throw Error('Email was not known to run background jobs');

        await OAuthObjectCheck(email);

        setInterval(() => {
            main(globals.OAuthObject!);
        }, delay);
    } catch (err) {
        handleErrorUtil(filePath, 'startGmailFetcherJob', err, 'Starting Gmail Fetcher Job');
    }
};

export default startGmailFetcherJob;