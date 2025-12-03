import lmsGenerate from "../adapters/lms.adapters";
import constants from "../constants/constants";
import globals from "../globals/globals";
import { handleErrorUtil } from "../utils/errors.utils";
import logger from "../utils/logger.utils";
import vm from "vm";

const filePath = "/agents/chat.agents.ts";
const defaultModel = constants.lmsModels.llm.BEST;
const temperature = 0;

let fetchDbSystemPrompt = `
MongoDB Query Generator — Plum InboundEmail Collection

You generate only MongoDB queries or aggregation pipelines for the Plum project.
Your job is to translate natural language into valid, safe, executable MongoDB queries.

STRICT NEW RULE:
NEVER produce a projection argument.
Your output MUST be exactly:
db.InboundEmail.find({ ... })
OR
db.InboundEmail.aggregate([ ... ])

Never generate a 2nd argument that selects fields.
Never output projection objects like { field: 1 } or { field: 0 }.

If a prompt is ambiguous or missing essential details, ask one clarifying question.

1. Collection Schema (follow exactly)
Collection: InboundEmail

Fields:
email: String, id: String, threadId: String, to: String, cc: String, bcc: String
senderEmail: String, senderName: String, subject: String
parsedDate: { weekday: String, day: String, month: String, year: String, time: String }
snippet: String, bodyHtml: String, bodyText: String
attachments: [{ filename: String, mimeType: String, size: Number, attachmentId: String }]
timestamp: String, sizeEstimate: Number, categories: [String]
isViewed: Boolean, createdAt: Date, updatedAt: Date

Core enforced schema rules stay unchanged.

Output: Only a code block containing db.InboundEmail.find() or db.InboundEmail.aggregate()
No projection argument allowed.
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

function extractInnerArgs(code: string): { type: "find" | "aggregate"; args: string[] } | null {
    if (!code) return null;
    const m = code.match(/db\.InboundEmail\.(find|aggregate)\s*\(\s*([\s\S]*)\s*\)\s*;?$/im);
    if (!m) return null;
    const type = m[1].toLowerCase() === "aggregate" ? "aggregate" : "find";
    let inner = m[2].trim();
    if (inner.endsWith(";")) inner = inner.slice(0, -1).trim();

    const args: string[] = [];
    let depth = 0;
    let currentArg = "";
    let inString = false;
    let stringChar = "";

    for (let i = 0; i < inner.length; i++) {
        const char = inner[i];
        const prevChar = i > 0 ? inner[i - 1] : "";

        if ((char === '"' || char === "'") && prevChar !== "\\") {
            if (!inString) {
                inString = true;
                stringChar = char;
            } else if (char === stringChar) {
                inString = false;
                stringChar = "";
            }
        }

        if (!inString) {
            if (char === "{" || char === "[") depth++;
            if (char === "}" || char === "]") depth--;

            if (char === "," && depth === 0) {
                args.push(currentArg.trim());
                currentArg = "";
                continue;
            }
        }

        currentArg += char;
    }

    if (currentArg.trim()) {
        args.push(currentArg.trim());
    }

    return { type, args };
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
                if (k.startsWith("parsedDate")) {
                    const val = cur[k];
                    if (val && typeof val === "object") {
                        for (const op of ["$gte", "$lte", "$gt", "$lt"]) {
                            if (Object.prototype.hasOwnProperty.call(val, op)) return true;
                        }
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

function sanitizeFindOptions(options: any): { valid: boolean; reason?: string; options?: any } {
    if (!options) return { valid: true, options: {} };
    if (typeof options !== "object" || Array.isArray(options)) {
        return { valid: false, reason: "find() options must be an object." };
    }
    const allowed = new Set(["sort", "skip", "limit", "hint", "collation", "batchSize"]);
    const out: any = {};
    for (const k of Object.keys(options)) {
        if (!allowed.has(k)) return { valid: false, reason: `find() option '${k}' is not allowed.` };
        out[k] = options[k];
    }
    if (out.limit !== undefined) {
        if (typeof out.limit !== "number" || !Number.isInteger(out.limit) || out.limit < 0) {
            return { valid: false, reason: "limit must be a non-negative integer." };
        }
        out.limit = Math.min(out.limit, 5000);
    }
    return { valid: true, options: out };
}

function sanitizeAggregateOptions(options: any): { valid: boolean; reason?: string; options?: any } {
    if (!options) return { valid: true, options: {} };
    if (typeof options !== "object" || Array.isArray(options)) {
        return { valid: false, reason: "aggregate() options must be an object." };
    }
    const allowed = new Set(["allowDiskUse", "cursor", "maxTimeMS"]);
    const out: any = {};
    for (const k of Object.keys(options)) {
        if (!allowed.has(k)) return { valid: false, reason: `aggregate() option '${k}' is not allowed.` };
        out[k] = options[k];
    }
    return { valid: true, options: out };
}

function validateParsedQuery(
    type: "find" | "aggregate",
    parsedArgs: any[],
    rawSource: string
): { valid: boolean; reason?: string } {
    if (type === "find") {
        if (parsedArgs.length < 1) {
            return { valid: false, reason: "find() requires at least 1 argument (filter)." };
        }

        const filter = parsedArgs[0];
        if (typeof filter !== "object" || Array.isArray(filter)) {
            return { valid: false, reason: "find() filter must be an object." };
        }

        if (parsedArgs.length > 1) {
            const second = parsedArgs[1];
            if (typeof second === "object" && !Array.isArray(second)) {
                return { valid: false, reason: "Projections are not permitted." };
            }
            if (typeof second === "number") {
            }
        }

        if (findHasTimestampRange(filter)) {
            return { valid: false, reason: "timestamp comparisons require aggregation." };
        }
        if (parsedDateMisuse(filter)) {
            return { valid: false, reason: "parsedDate fields cannot use ranges or operators." };
        }

        const forb = containsForbiddenOperators(filter);
        if (forb.found) return { valid: false, reason: `Disallowed operator: ${forb.op}` };

        if (usesRegexLiteral(rawSource) || containsNewRegExp(rawSource)) {
            return { valid: false, reason: "Regex must be JSON-style." };
        }

        return { valid: true };
    }

    if (parsedArgs.length < 1) {
        return { valid: false, reason: "aggregate() requires a pipeline array." };
    }

    const pipeline = parsedArgs[0];
    if (!Array.isArray(pipeline)) {
        return { valid: false, reason: "aggregate() first argument must be pipeline array." };
    }

    if (pipelineHasToDateGuardIssue(pipeline)) {
        return { valid: false, reason: "$toDate requires immediate type guard." };
    }
    if (pipelineHasUnwindBeforeGroupForAttachments(pipeline)) {
        return { valid: false, reason: "Attachments grouping requires unwind." };
    }

    const forb = containsForbiddenOperators(pipeline);
    if (forb.found) return { valid: false, reason: `Disallowed operator: ${forb.op}` };

    if (usesRegexLiteral(rawSource) || containsNewRegExp(rawSource)) {
        return { valid: false, reason: "Regex must be JSON-style." };
    }

    if (parsedDateMisuse(pipeline)) {
        return { valid: false, reason: "parsedDate misuse." };
    }

    return { valid: true };
}

async function findCollectionWithData(dbClient: any): Promise<{ collection: any; name: string } | null> {
    const possibleNames = [
        "InboundEmail", "inboundemail", "inboundEmail", "inbound_email",
        "InboundEmails", "inboundemails", "emails", "Emails", "email", "Email"
    ];

    logger.info(`Database: ${dbClient.databaseName || 'unknown'}`);

    try {
        const collections = await dbClient.listCollections().toArray();
        const collectionNames = collections.map((c: any) => c.name);
        logger.info(`Available collections: ${collectionNames.join(', ')}`);

        for (const name of possibleNames) {
            if (collectionNames.includes(name)) {
                const col = dbClient.collection(name);
                try {
                    const count = await col.countDocuments({}, { limit: 1 });
                    if (count > 0) {
                        logger.info(`Using collection '${name}' with data`);
                        return { collection: col, name };
                    }
                } catch { }
            }
        }

        for (const name of collectionNames) {
            if (name.toLowerCase().includes('email') || name.toLowerCase().includes('inbound')) {
                const col = dbClient.collection(name);
                try {
                    const count = await col.countDocuments({}, { limit: 1 });
                    if (count > 0) {
                        logger.info(`Fallback collection chosen: '${name}'`);
                        return { collection: col, name };
                    }
                } catch { }
            }
        }
    } catch (e) {
        logger.error(`Error listing collections: ${e}`);
    }

    logger.warn(`No collection with data found, using default 'InboundEmail'`);
    return { collection: dbClient.collection("InboundEmail"), name: "InboundEmail" };
}

async function executeQuery(
    type: "find" | "aggregate",
    parsedArgs: any[],
    options: { limit?: number } = {}
) {
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

    const collectionInfo = await findCollectionWithData(dbClient);
    if (!collectionInfo) throw new Error("No valid collection found");

    const collection = collectionInfo.collection;

    if (type === "find") {
        const filter = parsedArgs[0];

        let findOptions: any = {};

        for (let i = 1; i < parsedArgs.length; i++) {
            const arg = parsedArgs[i];
            if (typeof arg === "number") {
                findOptions.limit = arg;
            }
        }

        if (findOptions.projection) {
            logger.warn("Projection detected and removed.");
            delete findOptions.projection;
        }

        const lim = options.limit ?? findOptions.limit ?? 200;
        if (findOptions.limit) delete findOptions.limit;

        logger.info(`Executing find: ${JSON.stringify(filter)}`);
        if (Object.keys(findOptions).length) {
            logger.info(`Options: ${JSON.stringify(findOptions)}, limit: ${lim}`);
        }

        const totalCount = await collection.countDocuments({});
        logger.info(`Total documents: ${totalCount}`);

        const matchCount = await collection.countDocuments(filter);
        logger.info(`Matching documents: ${matchCount}`);

        const cursor = collection.find(filter, findOptions);
        if (lim) cursor.limit(lim);
        return await cursor.toArray();
    }

    const pipeline = parsedArgs[0];
    let aggOptions = {};

    const finalPipeline = Array.isArray(pipeline) ? pipeline.slice() : [];
    const hasLimitStage = finalPipeline.some(stage => Object.keys(stage)[0] === "$limit");

    if (!hasLimitStage) finalPipeline.push({ $limit: 1000 });

    logger.info(`Executing aggregation: ${JSON.stringify(finalPipeline)} options: ${JSON.stringify(aggOptions)}`);

    const cursor = collection.aggregate(finalPipeline, { allowDiskUse: true, ...aggOptions });
    return await cursor.toArray();
}

const fetchDb = async (socket: WebSocket, prompt: string): Promise<any | null> => {
    const maxRetries = 10;
    let attempt = 0;
    let finalResult: any | null = null;

    try {
        logger.info("Query Generator Agent Called");

        while (attempt < maxRetries && finalResult == null) {
            attempt++;

            logger.info(`Attempt ${attempt}/${maxRetries}`);

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

                const parsedArgs: any[] = [];
                let parseFailed = false;

                for (const arg of extracted.args) {
                    const parsed = parseLiteralSafe(arg);
                    if (parsed === null) {
                        logger.warn(`Failed to parse argument: ${arg}`);
                        parseFailed = true;
                        break;
                    }
                    parsedArgs.push(parsed);
                }

                if (parseFailed) continue;

                const validation = validateParsedQuery(extracted.type, parsedArgs, rawSource);

                if (!validation.valid) {
                    logger.warn(`Validation failed: ${validation.reason}`);
                    if (attempt >= maxRetries) {
                        return `Cannot produce validated MongoDB ${extracted.type} query. ${validation.reason}`;
                    }
                    continue;
                }

                try {
                    const execRes = await executeQuery(extracted.type, parsedArgs);
                    finalResult = execRes;
                    globals.mostRecentQuery = JSON.stringify(parsedArgs);
                    break;
                } catch (execErr) {
                    logger.error(`Execution error: ${execErr}`);
                    if (attempt >= maxRetries) throw execErr;
                    continue;
                }

            } catch (err) {
                logger.error(`Attempt ${attempt} failed: ${err}`);
            }
        }
    } catch (err) {
        handleErrorUtil(filePath, "queryGenerator", err, "Generating Mongodb Query");
    }

    globals.mostRecentQueryResult = finalResult;
    return finalResult;
};

export default fetchDb;