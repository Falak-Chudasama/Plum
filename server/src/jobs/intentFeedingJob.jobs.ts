import msAPIs from "../apis/ms.apis";
import { handleErrorUtil } from "../utils/errors.utils";
import globals from "../globals/globals";
import logger from "../utils/logger.utils";

const filePath = '/src/jobs/intentsFeedingJob.jobs.ts';
const delay = 10 * 60 * 1000;
let mainHasFed = false;

const intents = [
    { content: "Fetch from DB: Get all records from the database", meta: { intent: "fetch_db" } },
    { content: "Fetch from DB: Show me the database entries", meta: { intent: "fetch_db" } },
    { content: "Fetch from DB: Retrieve user data", meta: { intent: "fetch_db" } },
    { content: "Fetch from DB: Query the customer table", meta: { intent: "fetch_db" } },
    { content: "Fetch from DB: Pull all orders from last month", meta: { intent: "fetch_db" } },
    { content: "Fetch from DB: Fetch the product inventory", meta: { intent: "fetch_db" } },
    { content: "Fetch from DB: List all active users", meta: { intent: "fetch_db" } },
    { content: "Fetch from DB: Display transaction history", meta: { intent: "fetch_db" } },
    { content: "Fetch from DB: Load employee records", meta: { intent: "fetch_db" } },
    { content: "Fetch from DB: Extract data from the sales table", meta: { intent: "fetch_db" } },
    { content: "Fetch from DB: Give me all the database rows", meta: { intent: "fetch_db" } },
    { content: "Fetch from DB: Show records matching this criteria", meta: { intent: "fetch_db" } },
    { content: "Fetch from DB: Search the database for user profiles", meta: { intent: "fetch_db" } },
    { content: "Fetch from DB: Pull information from the orders collection", meta: { intent: "fetch_db" } },
    { content: "Fetch from DB: Read all entries in the logs table", meta: { intent: "fetch_db" } },

    { content: "Craft Mail: Write an email to John", meta: { intent: "craft_email" } },
    { content: "Craft Mail: Draft a message for my manager", meta: { intent: "craft_email" } },
    { content: "Craft Mail: Send an email to the client", meta: { intent: "craft_email" } },
    { content: "Craft Mail: Compose a professional email about the project", meta: { intent: "craft_email" } },
    { content: "Craft Mail: Help me write a reply to Sarah", meta: { intent: "craft_email" } },
    { content: "Craft Mail: Create an email template for customer outreach", meta: { intent: "craft_email" } },
    { content: "Craft Mail: Draft a follow-up message to the vendor", meta: { intent: "craft_email" } },
    { content: "Craft Mail: Prepare an email response to this inquiry", meta: { intent: "craft_email" } },
    { content: "Craft Mail: I need to email my team about the updates", meta: { intent: "craft_email" } },
    { content: "Craft Mail: Generate a thank you email for the interview", meta: { intent: "craft_email" } },
    { content: "Craft Mail: Write a formal email to HR", meta: { intent: "craft_email" } },
    { content: "Craft Mail: Compose a message declining the meeting", meta: { intent: "craft_email" } },
    { content: "Craft Mail: Draft an email requesting time off", meta: { intent: "craft_email" } },
    { content: "Craft Mail: Help me craft an apology email", meta: { intent: "craft_email" } },
    { content: "Craft Mail: Create an introduction email for the new hire", meta: { intent: "craft_email" } },

    { content: "How should I respond to a client's complaint email?", meta: { intent: "general" } },
    { content: "What's a polite way to ask for more time in an email?", meta: { intent: "general" } },
    { content: "Is it appropriate to CC the whole team on this update?", meta: { intent: "general" } },
    { content: "Suggest subject line options for a meeting follow-up.", meta: { intent: "general" } },
    { content: "What's a professional opening line for an apology email?", meta: { intent: "general" } },
    { content: "How to soften the tone when declining a request by email?", meta: { intent: "general" } },
    { content: "What information should I include in an introduction email?", meta: { intent: "general" } },
    { content: "How long should a status update email be?", meta: { intent: "general" } },
    { content: "Should I attach detailed reports or include summaries in the email?", meta: { intent: "general" } },
    { content: "What's the best way to ask for clarification over email?", meta: { intent: "general" } },
    { content: "How to write a concise email asking for availability?", meta: { intent: "general" } },
    { content: "Is it okay to use emojis in internal emails?", meta: { intent: "general" } },
    { content: "What are best practices for email subject lines?", meta: { intent: "general" } },
    { content: "How to phrase a reminder email without sounding pushy?", meta: { intent: "general" } },
    { content: "What tone works best for onboarding emails to new hires?", meta: { intent: "general" } },
    { content: "How to acknowledge receipt of an email professionally?", meta: { intent: "general" } },
    { content: "What are good closing lines for a formal email?", meta: { intent: "general" } },
    { content: "How to request feedback on a draft over email?", meta: { intent: "general" } },
    { content: "What privacy considerations should I mention when emailing customer data?", meta: { intent: "general" } },
    { content: "How to escalate an issue by email while keeping it diplomatic?", meta: { intent: "general" } }
];

const main = async () => {
    mainHasFed = true;
    try {
        logger.info('C Job. Intents Feeding Job Running');
        await msAPIs.intentDelAll();
        const response = await msAPIs.intentEmbed(intents);
        if (!response) mainHasFed = false;
        logger.info('C Job. Intents are successfully fed');
    } catch (err) {
        mainHasFed = false;
        logger.warn('C Job. Intents Feeding Job Stopped');
        handleErrorUtil(filePath, 'main', err, 'Feeding Intents / Calling MS APIs');
        throw Error(err);
    }
};

const startIntentsFeedingJob = async () => {
    try {
        if (globals.intentsFeedingJobRunning) return;
        logger.info('C Loop. Intents Feeding Job Loop Running');
        globals.intentsFeedingJobRunning = true;

        if (!mainHasFed) await main();
        logger.info(`C Loop. Job will begin in ${delay / 60000} minutes...`);
        setInterval(async () => {
            if (!mainHasFed) await main();
            logger.info(`C Loop. Job will begin in ${delay / 60000} minutes...`);
        }, delay);
    } catch (err) {
        logger.warn('C Loop. Intents Feeding Job Loop Stopped');
        globals.intentsFeedingJobRunning = false;
        handleErrorUtil(filePath, 'startIntentsFeedingJob', err, 'Starting Intents Feeding Job');
        throw Error(err);
    }
};

export default startIntentsFeedingJob;
export {
    main as intentsFeeding
};