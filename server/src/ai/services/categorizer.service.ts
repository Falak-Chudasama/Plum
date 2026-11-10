import basketClient from "../basket.client";
import { buildCategoryGrammar, validateCategory } from "../grammars/category.grammar";
import CategoryModel from "../../models/category";
import { InboundEmailType } from "../../types/types";
import logger from "../../utils/logger.utils";

const SYSTEM_PROMPT = `
You are an expert email categorization engine.
Your task is to assign each email to exactly one category from the user's category list.
Analyze the subject, body, and attachments of the email.
Output ONLY the category name. Do not explain your choice.
`.trim();

/**
 * Classifies an email using Basket and account-specific GBNF grammar.
 * Fully removes the old embedding/ChromaDB pipeline.
 */
export async function categorizeEmail(email: InboundEmailType, userEmail: string): Promise<string> {
    try {
        const categoryRecords = await CategoryModel.find({ email: userEmail });
        const categories = categoryRecords.map(c => c.category);

        const grammar = buildCategoryGrammar(categories);

        const emailContent = [
            `Subject: ${email.subject || "No Subject"}`,
            `From: ${email.senderName || ""} <${email.senderEmail || ""}>`,
            `Body:\n${(email.bodyText || email.snippet || "").slice(0, 1500)}`,
            email.attachments && email.attachments.length > 0
                ? `Attachments: ${email.attachments.map(a => a.filename).join(", ")}`
                : "",
        ].filter(Boolean).join("\n\n");

        const prompt = `Classify this email into one category:\n\n${emailContent}`;

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

