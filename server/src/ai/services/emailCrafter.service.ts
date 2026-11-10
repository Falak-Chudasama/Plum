import basketClient from "../basket.client";
import { EMAIL_COMPOSITION_GRAMMAR, validateAndSanitizeCraftedEmail, CraftedMailResult } from "../grammars/emailComposition.grammar";
import logger from "../../utils/logger.utils";

const CRAFT_MAIL_SYSTEM_PROMPT = `
You are the Plum Email Crafter agent powered by Basket AI.
Your job is to compose, rewrite, complete, or refine an email based on the user's natural language instruction and the current draft context.

You must output a single JSON object with the following keys:
- to: array of recipient email strings
- cc: array of email strings (or empty array)
- bcc: array of email strings (or empty array)
- subject: concise, relevant subject line
- body: full message body (use \\n for paragraph breaks, do NOT use HTML tags)

Rules:
1. Always generate valid JSON.
2. Context & Follow-Up Awareness:
   - If a 'Current Draft Body' is provided, treat the user instruction as a follow-up refinement, expansion, or rewrite. Retain existing facts/context from the draft while applying the requested changes.
   - If 'Recipients (To)' or 'Current Subject' are provided, preserve them unless the instruction requests a change.
   - If no draft body is provided, write the entire email from scratch based on the instruction.
3. Keep the tone natural, professional, and clear.
4. Do NOT output markdown code blocks or extra commentary. Output ONLY the JSON object.
`.trim();

export async function craftEmail(
    userPrompt: string,
    context?: string,
    authenticatedEmail?: string,
    userName?: string,
    currentSubject?: string,
    currentBody?: string,
    to?: string[] | string
): Promise<CraftedMailResult> {
    const authEmail = authenticatedEmail || "";
    logger.info(`[EmailCrafterService] Crafting email for user=${authEmail}`);

    const parts: string[] = [];
    if (context) parts.push(`Conversation Context:\n${context}`);
    if (userName) parts.push(`Sender: ${userName} <${authEmail}>`);
    if (to && (Array.isArray(to) ? to.length > 0 : String(to).trim())) {
        const toStr = Array.isArray(to) ? to.join(", ") : to;
        parts.push(`Recipients (To): ${toStr}`);
    }
    if (currentSubject && currentSubject.trim()) {
        parts.push(`Current Subject: ${currentSubject.trim()}`);
    }
    if (currentBody && currentBody.trim()) {
        parts.push(`Current Draft Body:\n${currentBody.trim()}`);
    }
    parts.push(`User Instruction: ${userPrompt.trim()}`);

    const userMessage = parts.join("\n\n");

    const rawResponse = await basketClient.complete({
        messages: [
            { role: "system", content: CRAFT_MAIL_SYSTEM_PROMPT },
            { role: "user", content: userMessage },
        ],
        grammar: EMAIL_COMPOSITION_GRAMMAR,
        temperature: 0.2,
        max_tokens: 1500,
    });

    const crafted = validateAndSanitizeCraftedEmail(rawResponse, authEmail);
    logger.info(`[EmailCrafterService] Successfully crafted email subject="${crafted.subject}" to=[${crafted.to.join(", ")}]`);

    return crafted;
}

