import ollamaGenerate from "../adapters/ollama.adapters";
import constants from "../constants/constants";
import { InboundEmailType, CategoryType } from "../types/types";
import { handleErrorUtil } from "../utils/errors.utils";
import logger from "../utils/logger.utils";

const filePath = '/agents/categorizer.agents.ts';

const model = constants.ollamaModels.qwenMed2;

const categorize = async (email: InboundEmailType, categories: CategoryType[]): Promise<string[] | null> => {
    try {
        const system = `
        You are an email categorization model.
        Below is a list of categories. Your task is to classify each email into one or two of these categories **only**. If the email doesn't clearly match any, classify it as "Other".

        Rules:
        - You must choose **at least 1 and at most 2** categories.
        - If the email clearly fits only one category, return just that.
        - If it fits more than one, return both — separated strictly by a comma.
        - If the email does not match any listed category, return only: Other
        - Return format must be like: Category1 or Category1,Category2
        - Be deterministic and return accurate output.
        - Absolutely no other text or explanation. Just the category names, comma-separated.

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