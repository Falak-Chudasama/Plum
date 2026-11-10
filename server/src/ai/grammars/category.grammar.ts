/**
 * GBNF Grammar Generator for Account-Specific Email Categorization
 *
 * Enforces that Basket returns exclusively an authorized category name
 * belonging to the authenticated account, or "Other".
 */

export function escapeGbnfLiteral(value: string): string {
    const escaped = value
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t");
    return `"${escaped}"`;
}

/**
 * Builds a dynamic GBNF grammar strictly matching one of the user's categories.
 * Always includes "Other" as a guaranteed fallback.
 */
export function buildCategoryGrammar(categories: string[]): string {
    const unique = Array.from(new Set(categories.map(c => c.trim()).filter(Boolean)));
    if (!unique.includes("Other")) {
        unique.push("Other");
    }

    const choices = unique.map(escapeGbnfLiteral).join(" | ");

    return [
        `root ::= choice`,
        `choice ::= ${choices}`,
    ].join("\n") + "\n";
}

/**
 * Validates the model output against the authenticated account's allowed categories.
 * Never allows the LLM to invent a category or select one outside the account.
 */
export function validateCategory(raw: string, allowedCategories: string[]): string {
    if (!raw) return "Other";
    const cleaned = raw.trim().replace(/^["']|["']$/g, "").trim();

    const matched = allowedCategories.find(c => c.toLowerCase() === cleaned.toLowerCase());
    if (matched) {
        return matched;
    }

    if (cleaned.toLowerCase() === "other") {
        return "Other";
    }

    return "Other";
}

