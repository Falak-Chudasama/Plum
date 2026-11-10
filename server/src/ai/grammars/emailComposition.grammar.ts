/**
 * GBNF Grammar and Validator for Email Composition / Drafting
 *
 * Enforces structured JSON output containing: to, cc, bcc, subject, body.
 */

export const EMAIL_COMPOSITION_GRAMMAR = `
root ::= "{" ws "\\"to\\"" ws ":" ws string-list ws "," ws "\\"cc\\"" ws ":" ws string-list ws "," ws "\\"bcc\\"" ws ":" ws string-list ws "," ws "\\"subject\\"" ws ":" ws json-string ws "," ws "\\"body\\"" ws ":" ws json-string ws "}"

string-list ::= "[" ws (json-string (ws "," ws json-string)*)? ws "]"

json-string ::= "\\"" ([^"\\\\\\x00-\\x1F] | "\\\\" (["\\\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F]))* "\\""

ws ::= [ \\t\\n\\r]*
`.trim();

export interface CraftedMailResult {
    from: string;
    to: string[];
    cc: string[];
    bcc: string[];
    replyTo: string;
    subject: string;
    body: string;
    category: string[];
    status: "unsaved" | "draft" | "sent";
}

/**
 * Validates and sanitizes email composition output.
 * Injects authenticated account email as the authoritative sender.
 */
export function validateAndSanitizeCraftedEmail(rawOutput: string, authenticatedEmail: string): CraftedMailResult {
    let parsed: any;
    try {
        const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawOutput);
    } catch {
        throw new Error("Invalid email composition: output is not valid JSON");
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("Invalid email composition: root must be a JSON object");
    }

    const toStringArray = (val: any): string[] => {
        if (!val) return [];
        if (Array.isArray(val)) {
            return val.map(item => String(item).trim()).filter(Boolean);
        }
        if (typeof val === "string") {
            return [val.trim()].filter(Boolean);
        }
        return [];
    };

    const to = toStringArray(parsed.to);
    const cc = toStringArray(parsed.cc);
    const bcc = toStringArray(parsed.bcc);

    const subject = typeof parsed.subject === "string" && parsed.subject.trim()
        ? parsed.subject.trim()
        : "No Subject";

    const body = typeof parsed.body === "string"
        ? parsed.body.trim()
        : "";

    if (!body) {
        throw new Error("Invalid email composition: email body cannot be empty");
    }

    return {
        from: authenticatedEmail,
        to,
        cc,
        bcc,
        replyTo: "",
        subject,
        body,
        category: ["Other"],
        status: "unsaved",
    };
}

