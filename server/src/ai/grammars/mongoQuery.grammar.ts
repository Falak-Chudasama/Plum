/**
 * GBNF Grammar and Safe Query Builder for MongoDB Natural Language Extraction
 *
 * Enforces strict, allowlisted read-only queries with mandatory account isolation
 * across BOTH Inbound and Outbound (sent/draft) emails.
 */

export const MONGO_QUERY_GRAMMAR = `
root ::= "{" ws query-fields ws "}"

query-fields ::= field (ws "," ws field)*

field ::= scope-field | status-field | recipient-field | to-field | sender-field | sender-name-field | subject-field | body-field | category-field | categories-field | viewed-field | limit-field

scope-field ::= "\\"scope\\"" ws ":" ws ("\\"all\\"" | "\\"inbound\\"" | "\\"outbound\\"" | "\\"sent\\"" | "\\"draft\\"")
status-field ::= "\\"status\\"" ws ":" ws ("\\"sent\\"" | "\\"draft\\"")
recipient-field ::= "\\"recipientEmail\\"" ws ":" ws json-string
to-field ::= "\\"to\\"" ws ":" ws json-string
sender-field ::= "\\"senderEmail\\"" ws ":" ws json-string
sender-name-field ::= "\\"senderName\\"" ws ":" ws json-string
subject-field ::= "\\"subject\\"" ws ":" ws json-string
body-field ::= "\\"body\\"" ws ":" ws json-string
category-field ::= "\\"category\\"" ws ":" ws json-string
categories-field ::= "\\"categories\\"" ws ":" ws string-list
viewed-field ::= "\\"isViewed\\"" ws ":" ws ("true" | "false")
limit-field ::= "\\"limit\\"" ws ":" ws [1-9] [0-9]?

string-list ::= "[" ws (json-string (ws "," ws json-string)*)? ws "]"
json-string ::= "\\"" ([^"\\\\\\x00-\\x1F] | "\\\\" (["\\\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F]))* "\\""
ws ::= [ \\t\\n\\r]*
`.trim();

export interface SafeQuerySpec {
    scope: "all" | "inbound" | "outbound" | "sent" | "draft";
    inboundFilter: Record<string, any>;
    outboundFilter: Record<string, any>;
    limit: number;
    sort: Record<string, 1 | -1>;
}

function escapeRegex(text: string): string {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

const ALLOWED_KEYS = new Set([
    "scope",
    "status",
    "recipientEmail",
    "to",
    "senderEmail",
    "senderName",
    "subject",
    "body",
    "category",
    "categories",
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

    const authEmail = authenticatedEmail.toLowerCase().trim();

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

    // Determine Scope
    let scope: SafeQuerySpec["scope"] = "all";
    if (parsed.scope && ["all", "inbound", "outbound", "sent", "draft"].includes(parsed.scope)) {
        scope = parsed.scope;
    } else if (parsed.recipientEmail || parsed.to || parsed.status) {
        scope = "outbound";
    }

    // Build Inbound Filter (MANDATORY TENANT ISOLATION on email)
    const inboundFilter: Record<string, any> = {
        email: authEmail,
    };

    // Build Outbound Filter (MANDATORY TENANT ISOLATION on from)
    const outboundFilter: Record<string, any> = {
        from: authEmail,
    };

    // Subject Filter
    if (typeof parsed.subject === "string" && parsed.subject.trim()) {
        const subRegex = { $regex: escapeRegex(parsed.subject.trim()), $options: "i" };
        inboundFilter.subject = subRegex;
        outboundFilter.subject = subRegex;
    }

    // Body Filter
    if (typeof parsed.body === "string" && parsed.body.trim()) {
        const safeBody = escapeRegex(parsed.body.trim());
        inboundFilter.$or = [
            { snippet: { $regex: safeBody, $options: "i" } },
            { bodyText: { $regex: safeBody, $options: "i" } },
        ];
        outboundFilter.body = { $regex: safeBody, $options: "i" };
    }

    // Category / Categories
    if (typeof parsed.category === "string" && parsed.category.trim()) {
        const catRegex = new RegExp(`^${escapeRegex(parsed.category.trim())}$`, "i");
        inboundFilter.categories = { $in: [catRegex] };
        outboundFilter.category = { $regex: escapeRegex(parsed.category.trim()), $options: "i" };
    }

    if (Array.isArray(parsed.categories) && parsed.categories.length > 0) {
        const regexes = parsed.categories
            .filter((c: any) => typeof c === "string" && c.trim())
            .map((c: string) => new RegExp(`^${escapeRegex(c.trim())}$`, "i"));
        if (regexes.length > 0) {
            inboundFilter.categories = { $in: regexes };
            outboundFilter.category = { $in: regexes };
        }
    }

    // Sender for Inbound
    if (typeof parsed.senderEmail === "string" && parsed.senderEmail.trim()) {
        inboundFilter.senderEmail = { $regex: escapeRegex(parsed.senderEmail.trim()), $options: "i" };
    }
    if (typeof parsed.senderName === "string" && parsed.senderName.trim()) {
        inboundFilter.senderName = { $regex: escapeRegex(parsed.senderName.trim()), $options: "i" };
    }

    // Recipient for Outbound
    const recipientStr = (parsed.recipientEmail || parsed.to || "").trim();
    if (recipientStr) {
        outboundFilter.to = { $regex: escapeRegex(recipientStr), $options: "i" };
        // If user searched for someone's name/email, they might also be in 'to' for inbound
        inboundFilter.to = { $regex: escapeRegex(recipientStr), $options: "i" };
    }

    // Outbound Status
    if (scope === "sent" || parsed.status === "sent") {
        outboundFilter.status = "sent";
    } else if (scope === "draft" || parsed.status === "draft") {
        outboundFilter.status = "draft";
    }

    // Viewed state (inbound only)
    if (typeof parsed.isViewed === "boolean") {
        inboundFilter.isViewed = parsed.isViewed;
    }

    // Clamp limit safely between 1 and 25
    let limit = 10;
    if (typeof parsed.limit === "number" && Number.isFinite(parsed.limit)) {
        limit = Math.min(Math.max(1, Math.floor(parsed.limit)), 25);
    }

    return {
        scope,
        inboundFilter,
        outboundFilter,
        limit,
        sort: { createdAt: -1 },
    };
}
