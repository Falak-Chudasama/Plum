/**
 * GBNF Grammar and Safe Query Builder for MongoDB Natural Language Extraction
 *
 * Enforces strict, allowlisted read-only queries with mandatory account isolation.
 */

export const MONGO_QUERY_GRAMMAR = `
root ::= "{" ws query-fields ws "}"

query-fields ::= field (ws "," ws field)*

field ::= category-field | categories-field | sender-field | sender-name-field | subject-field | body-field | viewed-field | limit-field

category-field ::= "\\"category\\"" ws ":" ws json-string
categories-field ::= "\\"categories\\"" ws ":" ws string-list
sender-field ::= "\\"senderEmail\\"" ws ":" ws json-string
sender-name-field ::= "\\"senderName\\"" ws ":" ws json-string
subject-field ::= "\\"subject\\"" ws ":" ws json-string
body-field ::= "\\"body\\"" ws ":" ws json-string
viewed-field ::= "\\"isViewed\\"" ws ":" ws ("true" | "false")
limit-field ::= "\\"limit\\"" ws ":" ws [1-9] [0-9]?

string-list ::= "[" ws (json-string (ws "," ws json-string)*)? ws "]"
json-string ::= "\\"" ([^"\\\\\\x00-\\x1F] | "\\\\" (["\\\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F]))* "\\""
ws ::= [ \\t\\n\\r]*
`.trim();

export interface SafeQuerySpec {
    filter: Record<string, any>;
    limit: number;
    sort: Record<string, 1 | -1>;
}

function escapeRegex(text: string): string {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

const ALLOWED_KEYS = new Set([
    "category",
    "categories",
    "senderEmail",
    "senderName",
    "subject",
    "body",
    "isViewed",
    "limit",
]);

/**
 * Parses model output into a validated, account-scoped MongoDB query.
 * The authenticated account email is MANDATORILY injected and cannot be bypassed.
 */
export function buildSafeMongoQuery(rawOutput: string, authenticatedEmail: string): SafeQuerySpec {
    if (!authenticatedEmail) {
        throw new Error("Cannot construct query: missing authenticated account context");
    }

    let parsed: any;
    try {
        const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawOutput);
    } catch {
        throw new Error("Invalid query generation: model did not return valid JSON");
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("Invalid query generation: root must be a JSON object");
    }

    // Reject unknown keys to prevent query injection
    for (const key of Object.keys(parsed)) {
        if (!ALLOWED_KEYS.has(key)) {
            throw new Error(`Unauthorized query parameter: '${key}' is not in the allowlist`);
        }
    }

    // MANDATORY TENANT ISOLATION: always scoped to the authenticated user's email
    const filter: Record<string, any> = {
        email: authenticatedEmail,
    };

    if (typeof parsed.category === "string" && parsed.category.trim()) {
        filter.categories = { $in: [new RegExp(`^${escapeRegex(parsed.category.trim())}$`, "i")] };
    }

    if (Array.isArray(parsed.categories) && parsed.categories.length > 0) {
        const regexes = parsed.categories
            .filter((c: any) => typeof c === "string" && c.trim())
            .map((c: string) => new RegExp(`^${escapeRegex(c.trim())}$`, "i"));
        if (regexes.length > 0) {
            filter.categories = { $in: regexes };
        }
    }

    if (typeof parsed.senderEmail === "string" && parsed.senderEmail.trim()) {
        filter.senderEmail = { $regex: escapeRegex(parsed.senderEmail.trim()), $options: "i" };
    }

    if (typeof parsed.senderName === "string" && parsed.senderName.trim()) {
        filter.senderName = { $regex: escapeRegex(parsed.senderName.trim()), $options: "i" };
    }

    if (typeof parsed.subject === "string" && parsed.subject.trim()) {
        filter.subject = { $regex: escapeRegex(parsed.subject.trim()), $options: "i" };
    }

    if (typeof parsed.body === "string" && parsed.body.trim()) {
        const safeBody = escapeRegex(parsed.body.trim());
        filter.$or = [
            { snippet: { $regex: safeBody, $options: "i" } },
            { bodyText: { $regex: safeBody, $options: "i" } },
        ];
    }

    if (typeof parsed.isViewed === "boolean") {
        filter.isViewed = parsed.isViewed;
    }

    // Clamp limit safely between 1 and 20
    let limit = 10;
    if (typeof parsed.limit === "number" && Number.isFinite(parsed.limit)) {
        limit = Math.min(Math.max(1, Math.floor(parsed.limit)), 20);
    }

    return {
        filter,
        limit,
        sort: { createdAt: -1 },
    };
}

