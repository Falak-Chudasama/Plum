import emailOps from "../controllers/email.controllers";
import { handleErrorUtil } from "../utils/errors.utils";
import logger from "../utils/logger.utils";
import User from "../models/user.models";
import { createOAuthClientForUser } from "../middlewares/googleAuth.middlewares";
import { categorizeEmails } from "../ai/services/categorizer.service";
import { InboundEmailType } from "../types/types";

const filePath = '/src/jobs/gmailFetcher.jobs.ts';
const delay = 10 * 60 * 1000;
let mainIsRunning = false;
let jobLoopStarted = false;

const main = async () => {
    if (mainIsRunning) return;
    mainIsRunning = true;

    try {
        logger.info('[GmailFetcherJob] Fetching emails for all active accounts');
        const users = await User.find({ "google.refreshToken": { $exists: true, $ne: "" } });

        for (const user of users) {
            try {
                const OAuth = await createOAuthClientForUser(user.email);
                const emails = await emailOps.fetchEmailsUtil(OAuth, 10);
                if (!emails || !emails.length) continue;
                const uniqueEmails = await emailOps.fetchUniqueEmails(emails as InboundEmailType[]);

                for (const uniqueEmail of uniqueEmails) {
                    uniqueEmail.email = user.email;
                }

                if (uniqueEmails.length === 0) {
                    logger.info(`[GmailFetcherJob] Detected 0 new inbox mails for ${user.email}`);
                    continue;
                }

                logger.info(`[GmailFetcherJob] Detected ${uniqueEmails.length} new inbox mails for ${user.email}`);
                const categorizedEmails = await categorizeEmails(uniqueEmails, user.email);
                const result = await emailOps.saveInboundEmails(categorizedEmails);
                logger.info(`[GmailFetcherJob] Saved ${result.inserted} categorized emails for ${user.email}`);
            } catch (userErr: any) {
                if (userErr.message?.includes('invalid_grant')) {
                    const MailboxModel = (await import("../models/mailbox.models")).default;
                    await MailboxModel.updateMany({ email: user.email }, { $set: { status: 'expired' } }).catch(() => {});
                }
                logger.warn(`[GmailFetcherJob] Could not fetch/categorize for ${user.email}: ${userErr.message}`);
            }
        }
    } catch (err) {
        handleErrorUtil(filePath, 'main', err, 'Fetching and categorizing emails');
    } finally {
        mainIsRunning = false;
    }
};

const startGmailFetcherJob = async () => {
    try {
        if (jobLoopStarted) return;
        jobLoopStarted = true;
        logger.info('[GmailFetcherJob] Job loop started');

        // Initial run
        main().catch((e) => logger.error(`[GmailFetcherJob] Initial run error: ${e.message}`));

        // Recurring interval
        setInterval(() => {
            main().catch((e) => logger.error(`[GmailFetcherJob] Interval run error: ${e.message}`));
        }, delay);
    } catch (err) {
        jobLoopStarted = false;
        handleErrorUtil(filePath, 'startGmailFetcherJob', err, 'Starting Gmail Fetcher Job');
    }
};

export default startGmailFetcherJob;
