import ollamaGenerate from "../adapters/ollama.adapters";
import constants from "../constants/constants";
import { InboundEmailType, CategoryType } from "../types/types";
import { handleErrorUtil } from "../utils/errors.utils";
import logger from "../utils/logger.utils";

const filePath = '/agents/categorizer.agents.ts';

const model = constants.ollamaModels.phi;

const categorize = async (email: InboundEmailType, categories: CategoryType[]): Promise<string[] | null> => {
    try {
        const system = `
        You are an email categorization assistant. You will be given (1) a list of VALID CATEGORIES (exact strings) and (2) a single email. Your job: **choose exactly one or two categories from the provided list — no more, no less**. If the email does not clearly match any provided category, return **Other**.

        Strict rules (follow exactly):

        * Output **only** the category name(s) from the provided list, nothing else: no explanations, no punctuation other than a single comma between two category names, no quotes, no code blocks, no newlines, no metadata.
        * Allowed output forms: CategoryName or CategoryName,CategoryName (a single comma separates two choices). Whitespace around names is allowed but avoid additional characters.
        * Use **at least 1 and at most 2** categories. If unsure or none apply, output exactly Other.
        * **Do NOT** invent new categories, synonyms, abbreviations, or alternate spellings. Use the category strings **exactly** as provided (case-sensitive match).
        * If two categories are returned, order them by relevance with the **more relevant (primary)** category first and the secondary next. Do not repeat the same category twice.
        * Be deterministic: prefer high-precision matches. If the email content is ambiguous, prefer Other over guessing.
        * Relevance guidance/tiebreakers (use only to rank categories, do not output these): prioritize subject > sender/context > body content; prefer actionable/intent signals (requests, offers, invoices, cancellations) over incidental mentions.
        * Never output any internal reasoning, probabilities, confidence scores, or commentary. Only the category name(s) as specified above.

        Respond exactly with the category name(s) chosen.

        Here are the available categories:
        ${categories
                .map((cat, idx) => `
                    Index: ${idx + 1}
                    Category: ${cat.category}
                    Description: ${cat.category}
                `)
                .join('\n\n')
            }
        `;

        const prompt = `
        This is the email to categorize: 
        
        from: ${email.senderEmail} / ${email.senderName}
        to: ${email.to}
        subject: ${email.subject}
        body: ${email.bodyText}
        `

        logger.info('Categorizer Agent Called');
        const response = await ollamaGenerate({ model, prompt, system, temperature: 0.0 });

        if (!response) {
            throw Error('Error getting response from ollama');
        }

        return response[0].split(',').map(cat => cat.trim());
    } catch (err) {
        handleErrorUtil(filePath, 'categorize', err, 'Categorizing the Email');
        return null;
    }
};

export default categorize;