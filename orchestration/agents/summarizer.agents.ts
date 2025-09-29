import ollamaGenerate from "../adapters/ollama.adapters";
import constants from "../constants/constants";
import { InboundEmailType } from "../types/types";
import { handleErrorUtil } from "../utils/errors.utils";
import logger from "../utils/logger.utils";

const filePath = '/agents/summarizer.agents.ts';

const model = constants.ollamaModels.llamaBig;
const maxPoints = 6;
const temperature = 0;

const summarize = async (emails: InboundEmailType[]): Promise<{ summary: string, highlights: string, insights: string, actions: string } | null> => {
    try {
        const systemHighlights = `
SYNTHESIZE across all emails and return up to ${maxPoints} **Highlights only** as bullets. Do NOT produce per-email lines.
Each bullet must be one single line, start exactly with "-   **", contain a one-line factual headline bolded, then optional short context prefixed by " …". No headings, numbering, analysis, actions, or extra text. Prioritize urgent/factual items first. Stop after the bullets.

Examples:
-   **Three invoices overdue from Vendor B** …totaling $12,450 across Sept invoices.
-   **AI certificate programme registrations open Oct 4–5** …limited seats; deadline Oct 1.
`;

        const systemInsights = `
        Return up to ${maxPoints} **Insights only** as bullets. Each bullet must be:
        - **One-line interpretive insight bolded** concise implication…optional short context.
        Focus on causes, risks, opportunities, or likely impact — do NOT restate raw facts.
        Do NOT include highlights (facts), actions, instructions, headings, or any extra text. Stop after the bullets.
        `;
        const systemActions = `
        Return up to ${maxPoints} **Actions only** as bullets. Each bullet must be:
        - **One-line imperative action bolded** concise, single-line…optional short context.
        Prioritize urgent/impactful actions first. Do NOT include highlights, insights, analysis, headings, or any extra text. Stop after the bullets.
        `;

        const prompt = `
        These are emails you need to summarize: 
        ${(
                emails.map((email, idx) => {
                    return `
                    subject: ${email.subject} \n
                    body: ${email.bodyText} \n\n
                `
                })
            )}
        `

        logger.info('Summarizer Agent Called');
        const highlights = await ollamaGenerate({ model, prompt, system: systemHighlights, temperature });
        if (!highlights) {
            throw Error('Error getting highlights response from ollama');
        }
        console.log(highlights);

        const insights = await ollamaGenerate({ model, prompt, system: systemInsights, temperature });
        if (!insights) {
            throw Error('Error getting insights response from ollama');
        }
        console.log(insights);
        
        const actions = await ollamaGenerate({ model, prompt, system: systemActions, temperature });
        if (!actions) {
            throw Error('Error getting actions response from ollama');
        }
        console.log(actions);

        const summary = [highlights, insights, actions].join('\n\n\n');

        return { summary, highlights, insights, actions };
    } catch (err) {
        handleErrorUtil(filePath, 'summarize', err, 'Summarizing the Emails');
        return null;
    }
};

export default summarize;