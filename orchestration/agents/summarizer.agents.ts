import ollamaGenerate from "../adapters/ollama.adapters";
import constants from "../constants/constants";
import { InboundEmailType } from "../types/types";
import { handleErrorUtil } from "../utils/errors.utils";

const filePath = '/agents/summarizer.agents.ts';

const model = constants.ollamaModels.phi;

const summarize = async (emails: InboundEmailType[]): Promise<string | null> => {
    try {
        const system = `
        You are an email summarization model.
        Your task is to summarize emails into a **crisp, structured, pointwise format**.
        Rules:
        - Most important information should appear first; least important at the end.
        - Use numbered or bulleted points.
        - Avoid emojis or unnecessary decorations.
        - Bold key information when necessary.
        - Summaries should be information-dense and concise, not a single paragraph.
        - Write for clarity: each point should convey a single idea.
        - Deterministic output; do not hallucinate.
        - Do not make the summary verbose, it must be concise.
        `;

        const prompt = `
        These are emails you need to summarize: 
        ${(
                emails.map((email, idx) => {
                    return `
                    Email no: ${idx + 1} ::
                    from: ${email.senderEmail} / ${email.senderName}
                    to: ${email.to}
                    subject: ${email.subject}
                    body: ${email.bodyText}
                `
                })
            )}
        `

        const response = await ollamaGenerate({ model, prompt, system, temperature: 0.2 });

        if (!response) {
            throw Error('Error getting response from ollama');
        }

        return response[0];
    } catch (err) {
        handleErrorUtil(filePath, 'summarize', err, 'Summarizing the Emails');
        return null;
    }
};

export default summarize;