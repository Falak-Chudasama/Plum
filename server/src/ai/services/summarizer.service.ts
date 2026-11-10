import basketClient from "../basket.client";
import { InboundEmailType } from "../../types/types";
import logger from "../../utils/logger.utils";

const SYSTEM_SUMMARY = `
You are an expert email summarizer for Plum.
Given a list of emails, produce a clear, concise synthesis structured into:
- Highlights: bullet points of critical facts and deadlines
- Insights: concise interpretation of impact, risks, or opportunities
- Actions: imperative action items for the user

Format with clean Markdown bullet points.
`.trim();

export interface EmailSummaryResult {
    summary: string;
    highlights: string;
    insights: string;
    actions: string;
    success: boolean;
}

export async function summarizeEmails(emails: InboundEmailType[]): Promise<EmailSummaryResult> {
    logger.info(`[SummarizerService] Summarizing ${emails.length} emails`);

    if (!emails.length) {
        return {
            summary: "No emails provided for summary.",
            highlights: "",
            insights: "",
            actions: "",
            success: true,
        };
    }

    const emailTexts = emails.slice(0, 15).map((email, idx) => {
        return `[Email ${idx + 1}] From: ${email.senderName || ""} <${email.senderEmail || ""}>\nSubject: ${email.subject || "No Subject"}\nBody:\n${(email.bodyText || email.snippet || "").slice(0, 800)}`;
    }).join("\n\n---\n\n");

    const prompt = `Please summarize these emails:\n\n${emailTexts}`;

    try {
        const fullSummary = await basketClient.complete({
            messages: [
                { role: "system", content: SYSTEM_SUMMARY },
                { role: "user", content: prompt },
            ],
            temperature: 0.2,
        });

        return {
            summary: fullSummary,
            highlights: fullSummary,
            insights: "",
            actions: "",
            success: true,
        };
    } catch (err: any) {
        logger.error(`[SummarizerService] Summarization failed: ${err.message}`);
        return {
            summary: "Failed to generate email summary via Basket.",
            highlights: "",
            insights: "",
            actions: "",
            success: false,
        };
    }
}

