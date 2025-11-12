import lmsGenerate from "../adapters/lms.adapters";
import constants from "../constants/constants";
import { handleErrorUtil } from "../utils/errors.utils";
import logger from "../utils/logger.utils";

const filePath = '/agents/chat.agents.ts';
const defaultModel = constants.lmsModels.llm.llamaHermes;
const temperature = 0;

let craftMailSystemPrompt = `
You are the Mail Crafter agent. Your only job is to convert a user's natural-language instruction into a single JSON object (or an array of JSON objects when the user explicitly asks for multiple distinct emails) that contains only the following fields, and nothing else: to, cc, bcc, subject, body.

Strict rules you must follow on every response:
1. Output exactly one JSON object, or an array of JSON objects when the user requested multiple emails. No extra text, no explanation, no code fences, no metadata, nothing else.
2. The JSON must be syntactically valid and parseable by standard JSON parsers. No trailing commas, no comments.
3. Only the five allowed keys may appear: to, cc, bcc, subject, body. Never include any other key (for example, do not include from, status, attachments, sentAt, category, replyTo, timestamps, or any defaults).
4. Use arrays for to, cc, and bcc even if they contain a single address. If a recipient list is empty or not provided by the user, omit that field entirely rather than outputting an empty array.
5. Do not output null, empty strings, or placeholder values for any of the five fields unless the user explicitly requested an empty value. Omit fields that are not applicable or not provided.
6. Email addresses must be valid-looking strings (for example "user@example.com"). If the user provides a name plus an address, prefer the plain email address. Do not invent real personal data.
7. subject must be a concise string that accurately reflects the email purpose. If the user asked explicitly for "no subject", set "subject": "No Subject". Otherwise, craft a reasonable subject when the user did not provide one.
8. body must be a single string. Use plain text or simple HTML only if the user explicitly asks for HTML. Preserve sensible line breaks using \\n for paragraphs.
9. If the user requests attachments or other fields that are not allowed here, do not add unsupported fields. Instead, if relevant, mention filenames or attachment instructions inside the body string (do not invent metadata).
10. If the user requests actions that cannot be represented in these five fields (for example "mark as sent", "schedule", "add tracking"), do not add extra keys. If appropriate, reflect the action in the body text (for example: "This message is sent now.") but do not create new fields.
11. If the user asks for multiple distinct emails in one prompt, return an array of JSON objects. Each object in the array must follow the same rules above.
12. When the user omits to entirely and a recipient is required by context (for example "send to accounts team"), try to infer a valid-looking address only when the user clearly provided identifying text such as accounts@client.com. If you cannot infer a valid address, return a JSON object that omits to and includes a clear, concise instructional body asking the caller to supply recipient addresses. Do not invent addresses in that case.
13. Never hallucinate dates, sizes, attachment IDs, or other factual metadata. Keep all content grounded in the user instruction.
14. Keep responses concise and focused. Order of keys does not matter.

Two-shot examples you must mimic exactly in format (examples show exactly what the agent should return for similar user instructions). When operating live, return only the JSON shown below pattern and follow the strict rules above.

EXAMPLE 1
User instruction:
"Draft a short apology email to John at john@example.com for delaying the monthly report. Keep it polite and concise."

Agent must output exactly:
{
    "to": ["john@example.com"],
    "subject": "Apology for delayed monthly report",
    "body": "Hi John,\\n\\nI am sorry for the delay in delivering the monthly report. I take full responsibility and will send the completed report by end of day tomorrow. Thank you for your patience.\\n\\nRegards,\\n[USER's NAME]"
}

EXAMPLE 2
User instruction:
"Send the November invoice to accounts@client.com with attachment invoice_NOV.pdf. Mark it as sent and include a short message."

Agent must output exactly:
{
    "to": ["accounts@client.com"],
    "subject": "November Invoice",
    "body": "Hello,\\n\\nPlease find attached the November invoice (invoice_NOV.pdf). This message is sent now. Let me know if you need any changes.\\n\\nBest regards,\\nBilling Team"
}

End of system instructions. When you receive the user prompt, produce only the JSON that follows these rules.
`;

const extractJSON = (text: any): string | null => {
    if (text == null) return null;
    if (typeof text !== 'string') {
        try { 
            text = JSON.stringify(text); 
        } catch { 
            text = String(text); 
        }
    }
    text = text.replace(/```[a-z]*|```/gi, '').trim();
    const match = text.match(/(\{[\s\S]*?\}|\[[\s\S]*?\])/);
    return match ? match[0].trim() : null;
};

const parseJSONSafe = (jsonText: string): any | null => {
    if (typeof jsonText !== 'string') return null;
    try { 
        return JSON.parse(jsonText); 
    } catch { 
        return null; 
    }
};

const extractEmail = (raw: string): string | null => {
    if (typeof raw !== 'string') return null;
    raw = raw.trim();
    const angleMatch = raw.match(/<([^>]+)>/);
    if (angleMatch) raw = angleMatch[1].trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(raw) ? raw : null;
};

function cleanMailJson(mail: any): any | null {
    if (mail == null) return null;
    const raw = extractJSON(mail);
    if (!raw) return null;
    const parsed = parseJSONSafe(raw);
    if (!parsed) return null;

    const entries = Array.isArray(parsed) ? parsed : [parsed];
    const cleanedEntries: any[] = [];

    for (const entry of entries) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
        const cleaned: any = {};
        const allowed = new Set(['to', 'cc', 'bcc', 'subject', 'body']);
        for (const key of Object.keys(entry)) {
            if (!allowed.has(key)) continue;
            const val = entry[key];
            if (key === 'to' || key === 'cc' || key === 'bcc') {
                let arr: any[] = [];
                if (Array.isArray(val)) {
                    arr = val.slice();
                } else if (typeof val === 'string' && val.trim() !== '') {
                    arr = [val];
                } else if (val == null) {
                    arr = [];
                }
                const normalized = arr
                    .map((v) => (typeof v === 'string' ? v.trim() : ''))
                    .map((s) => {
                        if (!s) return null;
                        return extractEmail(s);
                    })
                    .filter((e): e is string => typeof e === 'string' && e.length > 0);
                if (normalized.length > 0) cleaned[key] = normalized;
            } else if (key === 'subject') {
                if (typeof val === 'string' && val.trim() !== '') {
                    cleaned.subject = val.trim();
                }
            } else if (key === 'body') {
                if (typeof val === 'string') {
                    const trimmed = val.trim();
                    if (trimmed !== '') cleaned.body = trimmed;
                } else {
                    try {
                        const maybe = JSON.stringify(val);
                        if (maybe && maybe !== '{}' && maybe !== '[]') {
                            cleaned.body = maybe;
                        }
                    } catch {}
                }
            }
        }
        cleanedEntries.push(cleaned);
    }

    if (!Array.isArray(parsed)) {
        const single = cleanedEntries[0] ?? null;
        if (!single) return null;
        return single;
    }

    const validOnes = cleanedEntries.filter((c) => Array.isArray(c.to) && c.to.length > 0);
    if (validOnes.length === 0) return null;
    return validOnes;
}

function validateJson(cleanedMail: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!cleanedMail) {
        errors.push('No valid mail object provided for validation.');
        return { valid: false, errors };
    }
    
    const objs = Array.isArray(cleanedMail) ? cleanedMail : [cleanedMail];
    const allowedKeys = new Set(['to', 'cc', 'bcc', 'subject', 'body']);
    
    for (let i = 0; i < objs.length; i++) {
        const obj = objs[i];
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
            errors.push(`Entry ${i}: expected object.`);
            continue;
        }
        
        const keys = Object.keys(obj);
        
        for (const k of keys) {
            if (!allowedKeys.has(k)) {
                errors.push(`Entry ${i}: unexpected key "${k}" present.`);
            }
        }
        
        if (!Array.isArray(obj.to) || obj.to.length === 0) {
            if (!obj.body || typeof obj.body !== 'string' || obj.body.trim().length === 0) {
                errors.push(`Entry ${i}: "to" must be a non-empty array, or body must contain instructions.`);
            }
        } else {
            for (const addr of obj.to) {
                if (typeof addr !== 'string' || !extractEmail(addr)) {
                    errors.push(`Entry ${i}: invalid email in "to": ${JSON.stringify(addr)}`);
                }
            }
        }
        
        for (const field of ['cc', 'bcc'] as const) {
            if (field in obj) {
                if (!Array.isArray(obj[field])) {
                    errors.push(`Entry ${i}: "${field}" must be an array if present.`);
                } else {
                    for (const addr of obj[field]) {
                        if (typeof addr !== 'string' || !extractEmail(addr)) {
                            errors.push(`Entry ${i}: invalid email in "${field}": ${JSON.stringify(addr)}`);
                        }
                    }
                }
            }
        }
        
        if ('subject' in obj && typeof obj.subject !== 'string') {
            errors.push(`Entry ${i}: "subject" must be a string.`);
        }
        
        if ('body' in obj) {
            if (typeof obj.body !== 'string') {
                errors.push(`Entry ${i}: "body" must be a string (not an array/object).`);
            } else if (obj.body.trim().length === 0) {
                errors.push(`Entry ${i}: "body" is empty.`);
            }
        }
    }
    
    return { valid: errors.length === 0, errors };
}

const mailCrafter = async (
    socket: WebSocket, 
    prompt: string, 
    model: string = defaultModel
): Promise<any | null> => {
    const maxRetries = 5;
    let attempt = 0;
    let finalMail: any | null = null;

    try {
        logger.info("Mail Crafter Agent Called");
        
        while (attempt < maxRetries && finalMail == null) {
            attempt++;
            logger.info(`Mail Crafter Attempt ${attempt} of ${maxRetries}`);
            
            try {
                const response = await lmsGenerate({ 
                    socket, 
                    model, 
                    prompt, 
                    system: craftMailSystemPrompt, 
                    intent: "craft_mail", 
                    temperature, 
                    stream: false 
                });
                
                const emailObj = response?.choices[0].message.content;
                
                const cleaned = cleanMailJson(emailObj);
                
                if (!cleaned) {
                    logger.warn(`Attempt ${attempt}: Could not extract or parse valid JSON from response`);
                    continue;
                }
                
                const validation = validateJson(cleaned);
                
                if (validation.valid) {
                    logger.info(`Mail Crafter succeeded on attempt ${attempt}`);
                    finalMail = cleaned;
                    break;
                } else {
                    logger.warn(`Invalid mail JSON on attempt ${attempt}`);
                    logger.warn(`Errors: ${validation.errors.join("; ")}`);
                }
            } catch (err) {
                logger.error(`Mail Crafter failed on attempt ${attempt}: ${err}`);
            }
            
            if (finalMail == null && attempt < maxRetries) {
                logger.info("Retrying mail crafting...");
            }
        }
        
        if (finalMail == null) {
            logger.warn(`Mail Crafter failed after ${maxRetries} attempts. No valid email JSON generated.`);
        }
    } catch (err) {
        handleErrorUtil(filePath, "mailCrafter", err, "Crafting Mail");
    }
    
    console.log(finalMail);
    return finalMail;
};

export default mailCrafter;