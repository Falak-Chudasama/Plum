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
Your job is to translate natural language into valid, safe, executable MongoDB queries that match the schema exactly.

You must not add explanations, commentary, or extra text unless the user explicitly asks for them.

If a prompt is ambiguous or missing essential details, ask one short clarifying question.

1. Collection Schema (must follow exactly)

Collection name: InboundEmail

Fields:
email: String, id: String, threadId: String, to: String, cc: String, bcc: String
senderEmail: String, senderName: String, subject: String
parsedDate: { weekday: String, day: String, month: String, year: String, time: String }
snippet: String, bodyHtml: String, bodyText: String
attachments: [{ filename: String, mimeType: String, size: Number, attachmentId: String }]
timestamp: String (ISO date string), sizeEstimate: Number, categories: [String]
isViewed: Boolean, createdAt: Date, updatedAt: Date

2. Core Rules (MUST ALWAYS FOLLOW)

2.1 Collection name: Use only db.InboundEmail

2.2 Field correctness: Use field names exactly from the schema

2.3 parsedDate rules: parsedDate fields are strings only
- Allowed: { "parsedDate.month": "October" }, { "parsedDate.weekday": { $in: ["Thu","Thursday"] } }
- Forbidden: range operators on parsedDate, sorting by parsedDate, $toDate on parsedDate

2.4 Query Format:
db.InboundEmail.find(FILTER, PROJECTION, OPTIONS...)
Where FILTER is query criteria (required), PROJECTION is field selection (optional), OPTIONS are allowed find options (optional)
Example: db.InboundEmail.find({ "parsedDate.month": "October", isViewed: false }, { subject: 1 }, { sort: { timestamp: -1 }, limit: 50 })

2.5 timestamp rules: Use timestamp with $toDate only for explicit date ranges (aggregation)

2.6 Array handling: Use $elemMatch for arrays, $unwind before $group on array fields

2.7 Regex: Use JSON style only { $regex: "pattern", $options: "i" }

2.8 Security: Forbidden operators: $where, $function, $accumulator, eval, new RegExp()

3. Output: Return ONLY the query in a code block, no explanations
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

function sanitizeFindOptions(options: any): { valid: boolean; reason?: string; options?: any } {
    if (!options) return { valid: true, options: {} };
    if (typeof options !== "object" || Array.isArray(options)) return { valid: false, reason: "find() options must be an object." };
    const allowed = new Set(["projection", "sort", "skip", "limit", "hint", "collation", "batchSize"]);
    const out: any = {};
    for (const k of Object.keys(options)) {
        if (!allowed.has(k)) return { valid: false, reason: `find() option '${k}' is not allowed.` };
        out[k] = options[k];
    }
    // limit must be a non-negative integer
    if (out.limit !== undefined) {
        if (typeof out.limit !== "number" || !Number.isInteger(out.limit) || out.limit < 0) return { valid: false, reason: "limit must be a non-negative integer." };
        // hard cap
        out.limit = Math.min(out.limit, 5000);
    }
    if (out.skip !== undefined) {
        if (typeof out.skip !== "number" || !Number.isInteger(out.skip) || out.skip < 0) return { valid: false, reason: "skip must be a non-negative integer." };
    }
    return { valid: true, options: out };
}

function sanitizeAggregateOptions(options: any): { valid: boolean; reason?: string; options?: any } {
    if (!options) return { valid: true, options: {} };
    if (typeof options !== "object" || Array.isArray(options)) return { valid: false, reason: "aggregate() options must be an object." };
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

        // Validate additional arguments: they can be projection (object) or options (object) or numeric limit
        const extraArgs = parsedArgs.slice(1);
        let projectionProvided = false;
        let combinedOptions: any = {};

        for (const arg of extraArgs) {
            if (typeof arg === "number") {
                // numeric limit
                combinedOptions.limit = arg;
                continue;
            }
            if (Array.isArray(arg)) return { valid: false, reason: "Unexpected array argument for find()." };
            if (typeof arg === "object") {
                // Heuristic: first object after filter is treated as projection if it looks like projection (values are 0/1 or truthy)
                const looksLikeProjection = Object.values(arg).every(v => typeof v === 'number' && (v === 0 || v === 1) || typeof v === 'boolean');
                if (!projectionProvided && looksLikeProjection) {
                    projectionProvided = true;
                    combinedOptions.projection = arg as any;
                    continue;
                }
                // Otherwise treat as options to be merged
                combinedOptions = { ...combinedOptions, ...arg };
                continue;
            }
            return { valid: false, reason: "Unsupported argument type for find()." };
        }

        // security and semantic checks
        if (findHasTimestampRange(filter)) {
            return { valid: false, reason: "timestamp comparisons require aggregation with $toDate + guard." };
        }
        if (parsedDateMisuse(filter)) {
            return { valid: false, reason: "parsedDate fields cannot use range or object comparisons." };
        }
        const forb = containsForbiddenOperators(filter) || containsForbiddenOperators(combinedOptions);
        if (forb.found) return { valid: false, reason: `Disallowed operator: ${forb.op}` };
        if (usesRegexLiteral(rawSource) || containsNewRegExp(rawSource)) {
            return { valid: false, reason: "Regex must use JSON-style { $regex: 'x', $options: 'i' }." };
        }

        const sanitized = sanitizeFindOptions(combinedOptions);
        if (!sanitized.valid) return { valid: false, reason: sanitized.reason };

        return { valid: true };
    } else {
        if (parsedArgs.length < 1) {
            return { valid: false, reason: "aggregate() requires at least 1 argument (pipeline array)." };
        }
        const pipeline = parsedArgs[0];
        if (!Array.isArray(pipeline)) {
            return { valid: false, reason: "aggregate() first argument must be an array (pipeline)." };
        }
        // optional options object
        const aggOptions = parsedArgs.length > 1 ? parsedArgs[1] : undefined;
        if (aggOptions !== undefined && (typeof aggOptions !== 'object' || Array.isArray(aggOptions))) {
            return { valid: false, reason: "aggregate() options must be an object if provided." };
        }

        if (pipelineHasToDateGuardIssue(pipeline)) {
            return { valid: false, reason: "$toDate requires an immediate tsDate type guard." };
        }
        if (pipelineHasUnwindBeforeGroupForAttachments(pipeline)) {
            return { valid: false, reason: "$group on attachments.* requires prior $unwind." };
        }
        const forb = containsForbiddenOperators(pipeline) || (aggOptions ? containsForbiddenOperators(aggOptions) : { found: false });
        if (forb.found) return { valid: false, reason: `Disallowed operator: ${forb.op}` };
        if (usesRegexLiteral(rawSource) || containsNewRegExp(rawSource)) {
            return { valid: false, reason: "Regex must be JSON-style only." };
        }
        if (parsedDateMisuse(pipeline)) {
            return { valid: false, reason: "parsedDate fields misused." };
        }

        const sanitized = sanitizeAggregateOptions(aggOptions);
        if (!sanitized.valid) return { valid: false, reason: sanitized.reason };

        return { valid: true };
    }
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
                } catch (e) {
                    logger.warn(`Collection '${name}' exists but error checking: ${e}`);
                }
            }
        }
        
        for (const name of collectionNames) {
            if (name.toLowerCase().includes('email') || name.toLowerCase().includes('inbound')) {
                const col = dbClient.collection(name);
                try {
                    const count = await col.countDocuments({}, { limit: 1 });
                    if (count > 0) {
                        logger.info(`Found email-related collection '${name}' with data`);
                        return { collection: col, name };
                    }
                } catch (e) {
                    continue;
                }
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
        // Build options by merging any additional args (numbers treated as limit, objects merged)
        let findOptions: any = {};
        for (let i = 1; i < parsedArgs.length; i++) {
            const arg = parsedArgs[i];
            if (typeof arg === 'number') {
                findOptions.limit = arg;
                continue;
            }
            if (typeof arg === 'object' && !Array.isArray(arg)) {
                // If looks like projection (values 0/1/boolean), treat as projection if not already set
                const looksLikeProjection = Object.values(arg).every(v => typeof v === 'number' && (v === 0 || v === 1) || typeof v === 'boolean');
                if (looksLikeProjection && !findOptions.projection) {
                    findOptions.projection = arg;
                    continue;
                }
                // otherwise merge as options
                findOptions = { ...findOptions, ...arg };
                continue;
            }
        }

        const lim = options.limit ?? findOptions.limit ?? 200;
        // Remove limit from options when using cursor.limit to avoid double-handling by driver
        if (findOptions.limit) delete findOptions.limit;

        logger.info(`Executing find: ${JSON.stringify(filter)}`);
        if (Object.keys(findOptions).length) logger.info(`Options: ${JSON.stringify(findOptions)}, limit: ${lim}`);
        
        const totalCount = await collection.countDocuments({});
        logger.info(`Total documents: ${totalCount}`);
        
        if (totalCount === 0) {
            logger.warn(`Collection '${collectionInfo.name}' is empty`);
            return [];
        }
        
        const matchCount = await collection.countDocuments(filter);
        logger.info(`Matching documents: ${matchCount}`);
        
        if (matchCount === 0 && totalCount > 0) {
            const sample = await collection.findOne({});
            logger.info(`Sample document keys: ${Object.keys(sample || {}).join(', ')}`);
            if (sample && filter["parsedDate.month"]) {
                logger.info(`Sample parsedDate: ${JSON.stringify(sample.parsedDate)}`);
            }
            if (sample && filter.isViewed !== undefined) {
                logger.info(`Sample isViewed: ${sample.isViewed} (type: ${typeof sample.isViewed})`);
            }
        }

        // Execute with options
        const cursor = collection.find(filter, findOptions);
        if (lim) cursor.limit(lim);
        return await cursor.toArray();
    } else {
        const pipeline = parsedArgs[0];
        // optional options object
        const aggOptions = parsedArgs.length > 1 && typeof parsedArgs[1] === 'object' ? parsedArgs[1] : {};
        const hasLimitStage = pipeline.some((stage: any) => Object.keys(stage)[0] === "$limit");
        const finalPipeline = Array.isArray(pipeline) ? pipeline.slice() : [];
        if (!hasLimitStage && !('cursor' in aggOptions)) finalPipeline.push({ $limit: 1000 });
        
        logger.info(`Executing aggregation: ${JSON.stringify(finalPipeline)} options: ${JSON.stringify(aggOptions)}`);
        
        const cursor = collection.aggregate(finalPipeline, { allowDiskUse: true, ...(aggOptions || {}) });
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