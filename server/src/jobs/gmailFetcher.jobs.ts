import settingsOps from "../controllers/settings.controllers";
import emailOps from "../controllers/email.controllers";
import categoryOps from "../controllers/category.controllers";
import { OAuthObjectCheck } from "../middlewares/googleAuth.middlewares";
import { handleErrorUtil } from "../utils/errors.utils";
import orchAPIs from "../apis/orch.apis";
import globals from "../globals/globals";

const filePath = '/src/jobs/gmailFetcher.jobs.ts';
const delay = 15 * 60 * 1000;
const n = 15;

const main = async (email: string, OAuth: any) => {
    try {
        const emails = await emailOps.fetchEmailsUtil(OAuth, n);
        const uniqueEmails = await emailOps.fetchUniqueEmails(emails);

        for (let uniqueEmail of uniqueEmails) {
            uniqueEmail.email = email;
        }

        if (uniqueEmails.length === 0) return;

        const categories = await categoryOps.find();
        const categorizedEmails = await orchAPIs.categorize(uniqueEmails, categories);
        if (!categorizedEmails) throw Error('Emails were not categorized - Make sure Orch is running');

        const result = await emailOps.saveInboundEmails(categorizedEmails.emails);
        console.log(result);
    } catch (err) {
        handleErrorUtil(filePath, 'main', err, 'Fetching mails / Calling OL Api');
    }
};

const startGmailFetcherJob = async () => {
    try {
        const email = await settingsOps.find('email');
        if (!email) throw Error('Email was not known to run background jobs');

        await OAuthObjectCheck(email);

        main(email, globals.OAuthObject!);

        console.log('Gmail Fetcher Job Called');
        await OAuthObjectCheck(email);
        setInterval(async () => {
            console.log('Gmail Fetcher Job Called');
            await OAuthObjectCheck(email);
        }, delay);
    } catch (err) {
        handleErrorUtil(filePath, 'startGmailFetcherJob', err, 'Starting Gmail Fetcher Job');
    }
};

export default startGmailFetcherJob;