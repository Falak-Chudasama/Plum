import basketClient from "../basket.client";
import { buildCategoryGrammar, validateCategory } from "../grammars/category.grammar";
import CategoryModel from "../../models/category";
import { InboundEmailType } from "../../types/types";
import logger from "../../utils/logger.utils";

const SYSTEM_PROMPT = `
You are an expert email categorization engine.
Your task is to assign each email to exactly one category from the allowed categories list.
Analyze the sender, subject, body, and attachments of the email.

Critical Classification Instructions:
- Match the email to a specific category ONLY if its subject and content clearly, unambiguously, and directly align with that category's guidelines.
- If the email does NOT clearly fit any specific category, or is general correspondence, ambiguous, promotional, or notification that fits no defined category, you MUST classify it as 'Other'.
- Output ONLY the exact category name. Do not include quotes, markdown, explanations, or any extra text.
`.trim();

/**
 * Classifies an email using Basket and account-specific GBNF grammar.
 * Fully removes the old embedding/ChromaDB pipeline.
 */
export async function categorizeEmail(email: InboundEmailType, userEmail: string): Promise<string> {
    try {
        const categoryRecords = await CategoryModel.find({ email: userEmail });
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

        const prompt = `User Categories:
${categoryGuidelines || "- No specific categories defined"}
- Other: Default category. MUST be chosen if the email fits none of the specific user categories above.

Classify this email (choose 'Other' if it fits none of the categories above):

${emailContent}`;

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

