import basketClient from "../basket.client";
import { buildCategoryGrammar, validateCategory } from "../grammars/category.grammar";
import CategoryModel from "../../models/category";
import { InboundEmailType } from "../../types/types";
import logger from "../../utils/logger.utils";

export const DEFAULT_PLUM_CATEGORIES = [
    {
        category: "Session",
        description: "Meetings, calendar invites, Google Meet/Zoom calls, interviews, webinars, appointments, sync sessions",
        color: "#89D66D",
        alert: false,
    },
    {
        category: "Academic",
        description: "Courses, classes, assignments, exams, research papers, grades, study materials, homework, lectures, university notices",
        color: "#B266E6",
        alert: false,
    },
    {
        category: "Deadline",
        description: "Urgent deadlines, due dates, action required, expiring notices, payment dues, critical cutoffs",
        color: "#EF4444",
        alert: true,
    },
    {
        category: "Opportunity",
        description: "Job offers, career opportunities, internships, scholarships, hackathons, fellowships, grants, professional networking",
        color: "#10B981",
        alert: false,
    },
    {
        category: "Holiday",
        description: "Travel confirmations, flights, hotels, vacation, family, holiday events, leisure, recreation, personal plans",
        color: "#F59E0B",
        alert: false,
    },
    {
        category: "Promotions",
        description: "Marketing newsletters, sales, discounts, product updates, promotional offers, brand digests, shopping",
        color: "#8B5CF6",
        alert: false,
    },
    {
        category: "Other",
        description: "General correspondence, automated transactional notifications, system alerts, receipts, or messages fitting no other category",
        color: "#64748B",
        alert: false,
    },
];

const SYSTEM_PROMPT = `
You are an expert email categorization engine for Plum workspace.
Your task is to classify an email into strictly ONE category from the provided allowed list.
Analyze the subject, sender, body snippet, and attachments.

Guidelines:
- Choose the specific category that best matches the email's topic and intent based on its category guidelines.
- Choose 'Session' for calendar invites, meeting invitations, Zoom/Meet links, and schedules.
- Choose 'Academic' for classes, coursework, homework, university/college announcements, research, or exams.
- Choose 'Deadline' for urgent notices, upcoming due dates, payment deadlines, or time-sensitive actions.
- Choose 'Opportunity' for job offers, recruiter outreach, internships, hackathons, grants, or scholarships.
- Choose 'Holiday' for flight/hotel bookings, travel confirmations, vacations, leisure, or family events.
- Choose 'Promotions' for marketing emails, product sale discounts, sales newsletters, or promotional campaigns.
- Choose 'Other' ONLY if the email is generic correspondence or transactional system alerts that fit none of the above.
- Output ONLY the exact category name. Do not output markdown, punctuation, explanations, or quotes.
`.trim();

/**
 * Classifies an email using Basket and account-specific GBNF grammar.
 * Fully removes the old embedding/ChromaDB pipeline.
 */
export async function categorizeEmail(email: InboundEmailType, userEmail: string): Promise<string> {
    try {
        let categoryRecords = await CategoryModel.find({ email: userEmail });

        // If no records found, also check if this email is a connected mailbox belonging to a user
        if (!categoryRecords || categoryRecords.length === 0) {
            const Mailbox = (await import("../../models/mailbox.models")).default;
            const mb = await Mailbox.findOne({ email: userEmail }).lean();
            if (mb?.userEmail) {
                categoryRecords = await CategoryModel.find({ email: mb.userEmail });
            }
        }

        // If user still has 0 custom categories, seed default categories for this account so they have rich defaults
        if (!categoryRecords || categoryRecords.length === 0) {
            try {
                const toInsert = DEFAULT_PLUM_CATEGORIES.map(c => ({ ...c, email: userEmail }));
                await CategoryModel.insertMany(toInsert);
                categoryRecords = await CategoryModel.find({ email: userEmail });
            } catch (seedErr) {
                categoryRecords = DEFAULT_PLUM_CATEGORIES as any;
            }
        }

        const categories = categoryRecords.map(c => c.category);
        if (!categories.includes("Other")) {
            categories.push("Other");
        }

        const grammar = buildCategoryGrammar(categories);

        const categoryGuidelines = categoryRecords
            .filter(c => c.category.toLowerCase() !== "other")
            .map(c => `- ${c.category}: ${c.description ? c.description.trim() : "Specific category for this topic"}`)
            .join("\n");

        const emailContent = [
            `Subject: ${email.subject || "No Subject"}`,
            `From: ${email.senderName || ""} <${email.senderEmail || ""}>`,
            `Body:\n${(email.bodyText || email.snippet || "").slice(0, 1500)}`,
            email.attachments && email.attachments.length > 0
                ? `Attachments: ${email.attachments.map(a => a.filename).join(", ")}`
                : "",
        ].filter(Boolean).join("\n\n");

        const prompt = `Available Categories:
${categoryGuidelines}
- Other: Default fallback category for miscellaneous messages that fit none of the categories above.

Email Content to Classify:
${emailContent}

Return ONLY the single category name:`;

        const rawResponse = await basketClient.complete({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: prompt },
            ],
            grammar,
            temperature: 0.0,
            max_tokens: 30,
        });

        const validated = validateCategory(rawResponse, categories);
        return validated;
    } catch (err: any) {
        logger.error(`[CategorizerService] Failed to categorize email for user=${userEmail}: ${err.message}`);
        return "Other";
    }
}

/**
 * Batch categorizes emails for an authenticated account.
 */
export async function categorizeEmails(emails: InboundEmailType[], userEmail: string): Promise<InboundEmailType[]> {
    logger.info(`[CategorizerService] Categorizing ${emails.length} emails for ${userEmail}`);
    for (const email of emails) {
        const category = await categorizeEmail(email, userEmail);
        email.categories = [category];
    }
    return emails;
}

