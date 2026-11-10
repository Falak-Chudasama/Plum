import basketClient from "../basket.client";
import { EMAIL_COMPOSITION_GRAMMAR, validateAndSanitizeCraftedEmail, CraftedMailResult } from "../grammars/emailComposition.grammar";
import logger from "../../utils/logger.utils";

const CRAFT_MAIL_SYSTEM_PROMPT = `
You are the Plum Email Crafter agent.
Your job is to convert the user's natural language instruction into a JSON email object.
You must output a single JSON object with the following keys:
- to: array of recipient email strings
- cc: array of email strings (or empty array)
- bcc: array of email strings (or empty array)
- subject: concise subject line
- body: full message body (use \\n for paragraph breaks)

Rules:
1. Always generate valid JSON.
2. If the user does not provide recipient addresses, leave 'to' as an empty array.
3. Keep the tone appropriate to the instruction.
4. Do NOT output code fences or extra commentary.
`.trim();

export async function craftEmail(
    userPrompt: string,
    context: string,
    authenticatedEmail: string,
    userName?: string
): Promise<CraftedMailResult> {
    logger.info(`[EmailCrafterService] Crafting email for user=${authenticatedEmail}`);

    const contextPart = context ? `Conversation Context:\n${context}\n\n` : "";
    const userPart = userName ? `Sender Name: ${userName}\n` : "";

    const userMessage = `${contextPart}${userPart}Instruction: ${userPrompt}`;

    const rawResponse = await basketClient.complete({
        messages: [
            { role: "system", content: CRAFT_MAIL_SYSTEM_PROMPT },
            { role: "user", content: userMessage },
        ],
        grammar: EMAIL_COMPOSITION_GRAMMAR,
        temperature: 0.2,
    });

    const crafted = validateAndSanitizeCraftedEmail(rawResponse, authenticatedEmail);
    logger.info(`[EmailCrafterService] Successfully crafted email subject="${crafted.subject}" to=[${crafted.to.join(", ")}]`);

    return crafted;
}

