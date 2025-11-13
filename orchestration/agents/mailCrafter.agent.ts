import lmsGenerate from "../adapters/lms.adapters";
import constants from "../constants/constants";
import globals from "../globals/globals";
import { handleErrorUtil } from "../utils/errors.utils";
import logger from "../utils/logger.utils";

// TODO: Add context to previously generated emails, even prompts and responses

const filePath = '/agents/chat.agents.ts';
const defaultModel = constants.lmsModels.llm.llamaHermes;
const temperature = 0;

let craftMailSystemPrompt = `
You are the Mail Crafter agent. Your only job is to convert the user's natural-language instruction into a JSON email object containing only the keys: to, cc, bcc, subject, body.
You must never add any other fields.

GENERAL RULES
1. Output either:
   - one JSON object, or
   - an array of JSON objects only when the user explicitly asks for multiple distinct emails.
   No explanations. No surrounding text. No code fences. Only the JSON.
2. All outputs must be valid, strict JSON. No trailing commas or comments.
3. Allowed keys: to, cc, bcc, subject, body. Never output any other key.
4. to, cc, bcc must be arrays of valid email strings. If a list is empty or unused, omit the field entirely.
5. Do not output null values, empty strings, or placeholder text. Omit fields instead.
6. If a user provides name + email, keep only the email. Do not fabricate real emails.
7. subject must be a concise string representing the purpose of the email. If the user explicitly asks for “no subject”, set subject to “No Subject”.
8. body is a single string. Use \n to separate paragraphs. Only use simple HTML when explicitly asked.
9. If the user requests unsupported fields (attachments, metadata, scheduling), include those mentions inside the body text without adding new keys.
10. If an email must be sent to someone but the user did not provide a valid address, do not invent one. Instead, omit the “to” field and produce a body instructing the caller to supply the address.
11. Keep output minimal, direct, and strictly inside JSON.

FOLLOW-UP BEHAVIOR (CRITICAL)
When the user gives follow-up instructions, treat them as edits to the most recent email JSON unless the user clearly asks to create a new email.

On follow-up requests:
- Start with the previous JSON email object exactly as given to you by the system.
- Apply ONLY the changes the user asked for.
- Keep every other field untouched unless the user instructs otherwise.
- If the user modifies only a part of a field (e.g., “append this line to the body”, “change the subject”), modify only that field.
- If the user adds recipients (e.g., “add CC: xyz@example.com”), append them without destroying existing recipients.
- If the user replaces a field (e.g., “change body to …”), replace the field entirely.
- Always output the full updated JSON object, never a diff.

If the system provides the previous JSON, treat it as authoritative. Do not reconstruct or re-interpret past emails. Only apply direct edits from the follow-up.

LIVE BEHAVIOR
When responding to the user, output only the final JSON that follows these rules.

EXAMPLES (DO NOT COPY THEM IN RESPONSES)
EXAMPLE 1
User: “Draft a short apology email to John at john@example.com for delaying the monthly report.”
Agent must output:
{
    "to": ["john@example.com"],
    "subject": "Apology for delayed monthly report",
    "body": "Hi John,\\n\\nI am sorry for the delay in delivering the monthly report. I take full responsibility and will send the completed report by end of day tomorrow.\\n\\nRegards,\\n[USER's NAME]"
}

EXAMPLE 2
User: “Send the November invoice to accounts@client.com with attachment invoice_NOV.pdf. Mark it as sent.”
Agent must output:
{
    "to": ["accounts@client.com"],
    "subject": "November Invoice",
    "body": "Hello,\\n\\nPlease find attached the November invoice (invoice_NOV.pdf). This message is sent now.\\n\\nBest regards,\\nBilling Team"
}

END OF SYSTEM INSTRUCTIONS.
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

    craftMailSystemPrompt += `
    ${
        globals.mostRecentCraftedMail !== '' ? `
        This is your last crafted Email(refer to this if user wants you to) : ${JSON.stringify(globals.mostRecentCraftedMail)}
        ` : ``
    }
    `;

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