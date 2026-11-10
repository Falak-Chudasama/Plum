/**
 * GBNF Grammar and Validator for Chat Intent Classification
 */

export const INTENT_GRAMMAR = `
root ::= choice
choice ::= "general" | "craft_email" | "fetch_db"
`.trim();

export type ChatIntent = "general" | "craft_email" | "fetch_db";

export function parseIntentOutput(rawOutput: string): { intent: ChatIntent; confidence: number } {
    const cleaned = rawOutput.trim().toLowerCase().replace(/^["']|["']$/g, "").trim();

    if (cleaned.includes("craft_email") || cleaned.includes("craft_mail")) {
        return { intent: "craft_email", confidence: 0.95 };
    }
    if (cleaned.includes("fetch_db") || cleaned.includes("query") || cleaned.includes("find_email")) {
        return { intent: "fetch_db", confidence: 0.95 };
    }
    return { intent: "general", confidence: 0.90 };
}

