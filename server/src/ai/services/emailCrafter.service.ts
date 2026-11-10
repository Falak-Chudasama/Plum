import basketClient from "../basket.client";
import { EMAIL_COMPOSITION_GRAMMAR, validateAndSanitizeCraftedEmail, CraftedMailResult } from "../grammars/emailComposition.grammar";
import logger from "../../utils/logger.utils";

const CRAFT_MAIL_SYSTEM_PROMPT = `
You are the Plum Email Crafter agent powered by Basket AI.
Your job is to compose, rewrite, complete, or refine an email based on the user's natural language instruction, draft context, and sender identity.

You must output a single JSON object with the following keys:
- to: array of recipient email strings
- cc: array of email strings (or empty array)
- bcc: array of email strings (or empty array)
- subject: concise, relevant subject line
- body: full message body (use \\n for paragraph breaks, do NOT use HTML tags)

Rules:
1. Always generate valid JSON.
2. Sender Identity & Sign-Off:
   - When a 'Sender Name' is provided (e.g. "Sender: Falak Chudasama <...>"), ALWAYS use this exact full name for the email sign-off (e.g. "Best regards,\\nFalak Chudasama"). NEVER use placeholders like "[Your Name]" or "[Sender]".
3. Context Notes & Personal Memory:
   - If 'Relevant Context Notes' are provided (e.g. boss email, preferred tone, project specifics), incorporate that knowledge directly (e.g. if the user says "Email my boss" and a context note states "abc@gmail.com is my boss' email", send to "abc@gmail.com").
4. Follow-Up & Refinement Awareness:
   - If a 'Current Draft Body' is provided, treat the instruction as a follow-up refinement, expansion, or rewrite. Retain existing facts/context from the draft while applying requested changes.
   - If 'Recipients (To)' or 'Current Subject' are provided, preserve them unless the instruction requests a change.
   - If no draft body is provided, write the entire email from scratch based on the instruction.
5. Keep the tone natural, professional, and clear.
6. Do NOT output markdown code blocks or extra commentary. Output ONLY the JSON object.
`.trim();

export async function craftEmail(
    userPrompt: string,
    context?: string,
    authenticatedEmail?: string,
    userName?: string,
    currentSubject?: string,
    currentBody?: string,
    to?: string[] | string,
    relevantNotes?: Array<{ title: string; content: string }>
): Promise<CraftedMailResult> {
    const authEmail = authenticatedEmail || "";
    logger.info(`[EmailCrafterService] Crafting email for user=${authEmail} (name=${userName || "unknown"})`);

    const parts: string[] = [];
    if (context) parts.push(`Conversation Context:\n${context}`);
    if (userName) {
        parts.push(`Sender Name: ${userName}`);
        parts.push(`Sender Address: ${userName} <${authEmail}>`);
    } else if (authEmail) {
        parts.push(`Sender Address: <${authEmail}>`);
    }

    if (relevantNotes && relevantNotes.length > 0) {
        parts.push(
            `Relevant Context Notes (User Memory):\n` +
            relevantNotes.map((n, i) => `[${i + 1}] ${n.title}: ${n.content}`).join("\n")
        );
    }

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
