import msAPIs from "../apis/ms.apis";
import { handleErrorUtil } from "../utils/errors.utils";
import globals from "../globals/globals";
import logger from "../utils/logger.utils";

const filePath = '/src/jobs/intentsFeedingJob.jobs.ts';
const delay = 10 * 60 * 1000;
let mainHasFed = false;

const intents = [
    // ---------------- FETCH DB ----------------
    { content: "Fetch from DB: Get all records from the database", meta: { intent: "fetch_db" } },
    { content: "Show me the database entries", meta: { intent: "fetch_db" } },
    { content: "Retrieve user data for user id 1234", meta: { intent: "fetch_db" } },
    { content: "Query the customer table for customers in Mumbai", meta: { intent: "fetch_db" } },
    { content: "Pull all orders from last month", meta: { intent: "fetch_db" } },
    { content: "Fetch the product inventory where stock < 10", meta: { intent: "fetch_db" } },
    { content: "List all active users", meta: { intent: "fetch_db" } },
    { content: "Display transaction history for account 9876", meta: { intent: "fetch_db" } },
    { content: "Load employee records with role developer", meta: { intent: "fetch_db" } },
    { content: "Extract data from the sales table between Jan and Mar", meta: { intent: "fetch_db" } },
    { content: "Give me all the database rows for the logs collection", meta: { intent: "fetch_db" } },
    { content: "Search database for user profiles with tag beta", meta: { intent: "fetch_db" } },
    { content: "Pull information from the orders collection where status pending", meta: { intent: "fetch_db" } },
    { content: "Read all entries in the logs table and return last 100", meta: { intent: "fetch_db" } },
    { content: "Find records matching this criteria and export CSV", meta: { intent: "fetch_db" } },

    // ---------------- CRAFT EMAIL ----------------
    // explicit write or draft requests
    { content: "Write an email to John about the meeting", meta: { intent: "craft_email" } },
    { content: "Draft a message for my manager requesting approval", meta: { intent: "craft_email" } },
    { content: "Send an email to the client introducing the new plan", meta: { intent: "craft_email" } },
    { content: "Compose a professional email about the project timeline", meta: { intent: "craft_email" } },
    { content: "Help me write a reply to Sarah's complaint", meta: { intent: "craft_email" } },

    // variations and helpers related to crafting
    { content: "Create an email template for customer outreach", meta: { intent: "craft_email" } },
    { content: "Draft a follow-up message to the vendor asking for status", meta: { intent: "craft_email" } },
    { content: "Prepare an email response to this inquiry", meta: { intent: "craft_email" } },
    { content: "I need to email my team about the updates, make it short", meta: { intent: "craft_email" } },
    { content: "Generate a thank you email for the interview", meta: { intent: "craft_email" } },

    // transformation prompts that request an email be made from text or notes
    { content: "Turn these notes into a concise email to the client", meta: { intent: "craft_email" } },
    { content: "Rewrite this message into a formal email", meta: { intent: "craft_email" } },
    { content: "Convert the chat transcript below into an email summary", meta: { intent: "craft_email" } },

    // requests about subject, tone, length, signature
    { content: "Suggest subject line options for this email and draft the email", meta: { intent: "craft_email" } },
    { content: "Make this email more polite and shorter", meta: { intent: "craft_email" } },
    { content: "Add a professional signature and CC to this draft", meta: { intent: "craft_email" } },

    // reply, forward, follow-up, resend, apology, extension
    { content: "Draft a reply accepting the meeting invite", meta: { intent: "craft_email" } },
    { content: "Compose a follow-up email after a sales meeting", meta: { intent: "craft_email" } },
    { content: "Write a polite apology email for missing the deadline", meta: { intent: "craft_email" } },
    { content: "Request an extension for my project submission by email", meta: { intent: "craft_email" } },
    { content: "Resend the previous email with a short note", meta: { intent: "craft_email" } },

    // scheduling, attachments, legal, translations
    { content: "Create an email with an attachment note and ask them to confirm receipt", meta: { intent: "craft_email" } },
    { content: "Draft an email inviting participants to a meeting and include suggested times", meta: { intent: "craft_email" } },
    { content: "Translate this message into a formal English email", meta: { intent: "craft_email" } },

    // templates and bulk
    { content: "Generate an outreach template for cold emails", meta: { intent: "craft_email" } },
    { content: "Create a bulk email template for customers announcing maintenance", meta: { intent: "craft_email" } },

    // edge cases that often confuse classifiers, explicitly crafting
    { content: "Make this into an email that sounds confident but polite", meta: { intent: "craft_email" } },
    { content: "I have these bullet points, draft an email to investors", meta: { intent: "craft_email" } },
    { content: "Compose a concise status update email based on these notes", meta: { intent: "craft_email" } },
    { content: "Help me craft a refusal email that is diplomatic", meta: { intent: "craft_email" } },

    // ---------------- GENERAL ----------------
    // user talking about emails but not requesting a new one
    { content: "You wrote a good email, good job", meta: { intent: "general" } },
    { content: "That was a well-crafted email", meta: { intent: "general" } },
    { content: "Nice email, I liked the tone", meta: { intent: "general" } },
    { content: "The email you wrote earlier was perfect", meta: { intent: "general" } },
    { content: "I don’t want to send a mail, just saying you did great", meta: { intent: "general" } },
    { content: "Don’t craft anything, I’m just complimenting your last email", meta: { intent: "general" } },
    { content: "Is it okay to CC the whole team on this update", meta: { intent: "general" } },
    { content: "What are best practices for email subject lines", meta: { intent: "general" } },
    { content: "How should I respond to a client's complaint email", meta: { intent: "general" } },
    { content: "What is a polite way to ask for more time in an email", meta: { intent: "general" } },
    { content: "How long should a status update email be", meta: { intent: "general" } },

    // clarification, status, history, or metadata requests about emails
    { content: "Who did you write the email to", meta: { intent: "general" } },
    { content: "Did you send that email or is it still in drafts", meta: { intent: "general" } },
    { content: "Show me the last email you created for me", meta: { intent: "general" } },
    { content: "List the subject lines of recent emails", meta: { intent: "general" } },

    // checks, confirmations, and control commands that are not write requests
    { content: "I want to check the draft before sending, do not send anything", meta: { intent: "general" } },
    { content: "Hold on, pause any email sending for now", meta: { intent: "general" } },
    { content: "Cancel the last email draft", meta: { intent: "general" } },

    // ambiguous human-language cases that must not trigger crafting
    { content: "That draft was excellent, no need to make another one", meta: { intent: "general" } },
    { content: "Is this okay to send", meta: { intent: "general" } },
    { content: "Do not send anything yet, just my feedback", meta: { intent: "general" } },
    { content: "I liked your last message, very professional", meta: { intent: "general" } },

    // small or single word messages that are not craft requests
    { content: "Thanks, that helps", meta: { intent: "general" } },
    { content: "Noted", meta: { intent: "general" } },
    { content: "Great job", meta: { intent: "general" } },
    { content: "No action needed", meta: { intent: "general" } }
];

const main = async () => {
    try {
        logger.info('C Job. Intents Feeding Job Running');
        await msAPIs.intentDelAll();
        const response = await msAPIs.intentEmbed(intents);
        mainHasFed = true;
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