import lmsGenerate from "../adapters/lms.adapters";
import constants from "../constants/constants";
import globals from "../globals/globals";
import { handleErrorUtil } from "../utils/errors.utils";
import logger from "../utils/logger.utils";
import util from "util";
import vm from "vm";

const filePath = "/agents/chat.agents.ts";
const defaultModel = constants.lmsModels.llm.llamaMongoQuery;
const temperature = 0;

let fetchDbSystemPrompt = `
MongoDB Query Generator — Plum InboundEmail Collection

You generate only MongoDB queries or aggregation pipelines for the Plum project.
Your job is to translate natural language into valid, safe, executable MongoDB queries that match the schema exactly.

You must not add explanations, commentary, or extra text unless the user explicitly asks for them.

If a prompt is ambiguous or missing essential details, ask one short clarifying question.

1. Collection Schema (must follow exactly)

Collection name: InboundEmail

Fields:

email: String

id: String

threadId: String

to: String

cc: String

bcc: String

senderEmail: String

senderName: String

subject: String

parsedDate: {

weekday: String

day: String

month: String

year: String

time: String
}

snippet: String

bodyHtml: String

bodyText: String

attachments: [{

filename: String

mimeType: String

size: Number

attachmentId: String
}]

timestamp: String (ISO date string)

sizeEstimate: Number

categories: [String]

isViewed: Boolean

createdAt: Date

updatedAt: Date

2. Core Rules (MUST ALWAYS FOLLOW)
2.1 Collection name

Use only:

db.InboundEmail


Never pluralize or change casing.

2.2 Field correctness

Use field names exactly from the schema.
If the user requests a field that does not exist, refuse briefly.

2.3 parsedDate rules (CRITICAL)

parsedDate.* are strings only.

You may use:

equality: { "parsedDate.month": "October" }

$in: { "parsedDate.weekday": { $in: ["Thu","Thursday"] } }

You may NOT:

compare parsedDate fields with numbers

compare parsedDate fields with Date objects

sort by parsedDate

convert parsedDate using $toDate

use $gte, $lte, $gt, $lt on parsedDate

2.4 timestamp rules

Use timestamp only when the user explicitly references:

date ranges

“between…”

“yesterday”, “last week”, etc.

When using timestamp:

{ $addFields: { tsDate: { $toDate: "$timestamp" } } }
{ $match: { tsDate: { $type: "date" } } }


Then apply date filters on tsDate.

If the user says “last week”, “this month”, “yesterday”:
→ Ask for explicit ISO start/end dates.

2.5 Array handling

Attachments and categories are arrays.

Allowed:

attachments: { $elemMatch: {...} }

"attachments.0": { $exists: true }

categories: "Work"

Aggregation on array elements requires:

$unwind "$attachments"


BEFORE any $group that references attachments.*.

2.6 Regex rules

Regex must be JSON style:

{ subject: { $regex: "invoice", $options: "i" } }


Forbidden:

new RegExp()

regex literals inside strings: "/invoice/"

unescaped dots

Domain matching must be:

{ senderEmail: { $regex: "@domain\\.com$", $options: "i" } }

2.7 Sorting rules

Allowed sort fields:

createdAt

updatedAt

tsDate (after conversion)

numbers (sizeEstimate, attachments.size via unwind)

string fields (senderEmail, senderName, subject)

Forbidden:

any parsedDate field

parsedDate object

month name ordering

sorting without conversion on timestamp

2.8 Security

Forbidden operators:

$where

$function

$accumulator

eval

server-side JS

new RegExp(...)

Use $expr only for inter-field comparisons, not for simple matches.

3. Query Output Rules

Unless the user explicitly asks for explanations:

Output ONLY a single JavaScript code block, e.g.:
db.InboundEmail.find({ isViewed: false })


or:

db.InboundEmail.aggregate([
  ...
])


No text outside the code block.

4. Ambiguity Handling

If intent is unclear, ask ONE short question, such as:

“Do you want to filter by sender name or sender email?”

“Please provide explicit ISO start and end timestamps.”

Do not guess.

5. Validation Before Output (Internal)

Before returning a query, validate:

Correct collection name

Only valid fields

parsedDate used only as strings and only in equality or $in

timestamp conversion guarded with $type: "date"

arrays handled with $unwind before $group

no forbidden operators

regex is JSON-safe and escaped

sort only on allowed fields

grouping fields preserved correctly

If validation fails → ask for clarification or refuse briefly.
`;

function extractCodeBlock(text: any): string | null {
    if (text == null) return null;
    if (typeof text !== "string") {
        try { text = String(text); } catch { return null; }
    }
    const fenceMatch = text.match(/```(?:js|javascript)?\s*([\s\S]*?)```/i);
    if (fenceMatch && fenceMatch[1]) text = fenceMatch[1].trim();
    const dbRegex = /db\.InboundEmail\.(find|aggregate)\s*\(([\s\S]*)\)\s*;?$/im;
    const match = text.match(dbRegex);
    if (match) return match[0].trim();
    if (/^\s*(db\.InboundEmail\.)/i.test(text)) return text.trim();
    return null;
}

function extractInnerArgs(code: string): { type: "find" | "aggregate"; inner: string } | null {
    if (!code) return null;
    const m = code.match(/db\.InboundEmail\.(find|aggregate)\s*\(\s*([\s\S]*)\s*\)\s*;?$/im);
    if (!m) return null;
    const type = m[1].toLowerCase() === "aggregate" ? "aggregate" : "find";
    let inner = m[2].trim();
    if (inner.endsWith(";")) inner = inner.slice(0, -1);
    return { type, inner };
}

function parseLiteralSafe(literal: string): any | null {
    if (typeof literal !== "string") return null;
    const forbiddenTokens = [
        "$where", "$function", "$accumulator", "eval(",
        "constructor(", "new Function", "function(",
        "=>", "process", "require(", "global", "window",
        "this.", "new RegExp"
    ];
    for (const tok of forbiddenTokens) {
        if (literal.includes(tok)) return null;
    }
    if (/\bISODate\s*\(|\bObjectId\s*\(|\bnew Date\s*\(/i.test(literal)) return null;
    try {
        const sandbox: any = {};
        const script = new vm.Script("(" + literal + ")", { timeout: 1000 });
        const context = vm.createContext(sandbox, { name: "safe-context" });
        const parsed = script.runInContext(context, { timeout: 1000 });
        return parsed;
    } catch {
        return null;
    }
}

function containsForbiddenOperators(obj: any): { found: boolean; op?: string } {
    const forbidden = ["$where", "$function", "$accumulator", "eval"];
    const stack: any[] = [obj];
    while (stack.length) {
        const cur = stack.pop();
        if (cur && typeof cur === "object") {
            for (const k of Object.keys(cur)) {
                if (forbidden.includes(k)) return { found: true, op: k };
                const val = cur[k];
                if (val && typeof val === "object") stack.push(val);
            }
        }
    }
    return { found: false };
}

function usesRegexLiteral(source: string): boolean {
    return /(^|[^\\])\/[^\/\n]+\/[gimsuy]*/.test(source);
}

function containsNewRegExp(source: string): boolean {
    return /new\s+RegExp\s*\(/i.test(source);
}

function parsedDateMisuse(obj: any): boolean {
    const stack: any[] = [obj];
    while (stack.length) {
        const cur = stack.pop();
        if (cur && typeof cur === "object") {
            for (const k of Object.keys(cur)) {
                if (k === "parsedDate" || k.startsWith("parsedDate")) {
                    const val = cur[k];
                    if (val && typeof val === "object") {
                        for (const op of ["$gte", "$lte", "$gt", "$lt"]) {
                            if (Object.prototype.hasOwnProperty.call(val, op)) return true;
                        }
                        if (k === "parsedDate" && typeof val !== "string") return true;
                    }
                }
                const val = cur[k];
                if (val && typeof val === "object") stack.push(val);
            }
        }
    }
    return false;
}

function findHasTimestampRange(obj: any): boolean {
    if (!obj || typeof obj !== "object") return false;
    if (Object.prototype.hasOwnProperty.call(obj, "timestamp")) {
        const t = obj["timestamp"];
        if (t && typeof t === "object") {
            for (const op of ["$gte", "$lte", "$gt", "$lt"]) {
                if (Object.prototype.hasOwnProperty.call(t, op)) return true;
            }
        }
    }
    return false;
}

function pipelineHasToDateGuardIssue(pipeline: any[]): boolean {
    if (!Array.isArray(pipeline)) return false;
    let usesToDate = false;
    for (let i = 0; i < pipeline.length; i++) {
        const stage = pipeline[i];
        if (!stage || typeof stage !== "object") continue;
        const op = Object.keys(stage)[0];
        if (!op) continue;
        if (op === "$addFields" || op === "$set") {
            const s = JSON.stringify(stage[op]);
            if (s.includes("$toDate")) usesToDate = true;
        }
        if (usesToDate) {
            const next = pipeline[i + 1];
            if (!next) return true;
            const nextOp = Object.keys(next)[0];
            if (nextOp !== "$match") return true;
            const nextStr = JSON.stringify(next);
            if (!/tsDate.*\$type.*["']date["']/.test(nextStr)) return true;
            return false;
        }
    }
    return false;
}

function pipelineHasUnwindBeforeGroupForAttachments(pipeline: any[]): boolean {
    if (!Array.isArray(pipeline)) return false;
    let sawUnwind = false;
    for (const stage of pipeline) {
        const key = Object.keys(stage)[0];
        if (key === "$unwind") {
            const val = stage[key];
            if (typeof val === "string" && val === "$attachments") sawUnwind = true;
            if (typeof val === "object" && val.path === "$attachments") sawUnwind = true;
        }
        if (key === "$group") {
            const groupStr = JSON.stringify(stage);
            if (groupStr.includes("attachments.")) {
                if (!sawUnwind) return true;
            }
        }
    }
    return false;
}

function validateParsedQuery(type: "find" | "aggregate", parsed: any, rawSource: string): { valid: boolean; reason?: string } {
    if (type === "find") {
        if (typeof parsed !== "object" || Array.isArray(parsed)) {
            return { valid: false, reason: "find() argument must be an object." };
        }
        if (findHasTimestampRange(parsed)) {
            return { valid: false, reason: "timestamp comparisons require aggregation with $toDate + guard." };
        }
        if (parsedDateMisuse(parsed)) {
            return { valid: false, reason: "parsedDate fields cannot use range or object comparisons." };
        }
        const forb = containsForbiddenOperators(parsed);
        if (forb.found) return { valid: false, reason: `Disallowed operator: ${forb.op}` };
        if (usesRegexLiteral(rawSource) || containsNewRegExp(rawSource)) {
            return { valid: false, reason: "Regex must use JSON-style { $regex: 'x', $options: 'i' }." };
        }
        return { valid: true };
    } else {
        if (!Array.isArray(parsed)) {
            return { valid: false, reason: "aggregate() argument must be an array." };
        }
        if (pipelineHasToDateGuardIssue(parsed)) {
            return { valid: false, reason: "$toDate requires an immediate tsDate type guard." };
        }
        if (pipelineHasUnwindBeforeGroupForAttachments(parsed)) {
            return { valid: false, reason: "$group on attachments.* requires prior $unwind." };
        }
        const forb = containsForbiddenOperators(parsed);
        if (forb.found) return { valid: false, reason: `Disallowed operator: ${forb.op}` };
        if (usesRegexLiteral(rawSource) || containsNewRegExp(rawSource)) {
            return { valid: false, reason: "Regex must be JSON-style only." };
        }
        if (parsedDateMisuse(parsed)) {
            return { valid: false, reason: "parsedDate fields misused." };
        }
        return { valid: true };
    }
}

async function executeQuery(type: "find" | "aggregate", parsed: any, options: { limit?: number } = {}) {
    let dbClient: any = null;
    try {
        if (globals && (globals.mongoClient || globals.db || globals.mongo)) {
            if (globals.mongoClient && globals.mongoClient.db) {
                dbClient = globals.mongoClient.db();
            } else if (globals.db) {
                dbClient = globals.db;
            } else if (globals.mongo && globals.mongo.db) {
                dbClient = globals.mongo.db();
            }
        }
    } catch { }
    if (!dbClient) throw new Error("Mongo client missing in globals.");

    const collection = dbClient.collection("InboundEmail");

    if (type === "find") {
        const lim = options.limit ?? 200;
        const cursor = collection.find(parsed).limit(lim);
        return await cursor.toArray();
    } else {
        const hasLimit = parsed.some((stage: any) => Object.keys(stage)[0] === "$limit");
        const pipeline = Array.isArray(parsed) ? parsed.slice() : [];
        if (!hasLimit) pipeline.push({ $limit: 1000 });
        const cursor = collection.aggregate(pipeline, { allowDiskUse: true });
        return await cursor.toArray();
    }
}

const fetchDb = async (socket: WebSocket, prompt: string): Promise<any | null> => {
    const maxRetries = 10;
    let attempt = 0;
    let finalResult: any | null = null;

    try {
        logger.info("Query Generator Agent Called");

        while (attempt < maxRetries && finalResult == null) {
            attempt++;

            logger.info(`Trying ${attempt} times...`);
            try {
                const response = await lmsGenerate({
                    socket,
                    model: defaultModel,
                    prompt,
                    system: fetchDbSystemPrompt,
                    intent: "generate_mongo_query",
                    temperature,
                    stream: false,
                });

                const rawContent = response?.choices?.[0]?.message?.content ?? response?.content ?? null;
                if (!rawContent || typeof rawContent !== "string") continue;

                const codeBlock = extractCodeBlock(rawContent);
                if (!codeBlock) continue;

                const extracted = extractInnerArgs(codeBlock);
                if (!extracted) continue;

                const rawSource = codeBlock;
                const parsed = parseLiteralSafe(extracted.inner);
                if (parsed == null) continue;

                const validation = validateParsedQuery(extracted.type, parsed, rawSource);
                if (!validation.valid) {
                    if (attempt >= maxRetries) {
                        return `I cannot produce a validated MongoDB ${extracted.type} query. ${validation.reason}`;
                    }
                    continue;
                }

                try {
                    const execRes = await executeQuery(extracted.type, parsed);
                    finalResult = execRes;
                    break;
                } catch (execErr) {
                    if (attempt >= maxRetries) throw execErr;
                    continue;
                }
            } catch { }
        }
    } catch (err) {
        handleErrorUtil(filePath, "queryGenerator", err, "Generating Mongodb Query");
    }

    return finalResult;
};

export default fetchDb;