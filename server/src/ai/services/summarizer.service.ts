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

    const contextItems = emails.slice(0, 15).map((email, idx) => ({
        content: `[Email ${idx + 1}] From: ${email.senderName || ""} <${email.senderEmail || ""}>\nSubject: ${email.subject || "No Subject"}\nBody:\n${(email.bodyText || email.snippet || "").slice(0, 800)}`,
        metadata: {
            subject: email.subject,
            sender: email.senderEmail,
            index: idx + 1,
        },
    }));

    try {
        const res = await basketClient.completion({
            prompt: "Please synthesize and summarize these emails with Highlights, Insights, and Actions.",
            application: "plum",
            system_prompt: SYSTEM_SUMMARY,
            context: contextItems,
            retrieve_notes: false,
            retrieve_chat: false,
            temperature: 0.2,
        });

        const fullSummary = res.content || "";

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

