/**
 * GBNF Grammar and Validator for Chat Title Generation
 */

export const CHAT_TITLE_GRAMMAR = `
root ::= "{" ws "\\"title\\"" ws ":" ws title-string ws "}"
title-string ::= "\\"" [a-zA-Z0-9 ]+ "\\""
ws ::= [ \\t\\n\\r]*
`.trim();

export function parseChatTitle(rawOutput: string): string {
    try {
        const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed && typeof parsed.title === "string" && parsed.title.trim()) {
                return parsed.title.trim().slice(0, 50);
            }
        }
    } catch {
        // fallback to regex extraction
    }

    const cleaned = rawOutput
        .replace(/[{}"]/g, "")
        .replace(/title\s*:/i, "")
        .trim();

    return cleaned ? cleaned.slice(0, 50) : "New Conversation";
}

