import lmsGenerate from "../adapters/lms.adapters";
import constants from "../constants/constants";
import { handleErrorUtil } from "../utils/errors.utils";
import logger from "../utils/logger.utils";

const filePath = '/agents/chatTitler.agents.ts';

const titlerModel = constants.lmsModels.llm.llamaHermes;
const temperature = 0;

const systemPrompt = `
You are a Chat Title Generator. For a given User and Assistant conversation pair, produce a concise title (maximum 7 words) that best represents the conversation. Output only the title text, plain, with no punctuation, no quotes, no extra formatting, and no explanation. Try to generate the title as concise as possible.

User: show me the latest emails from amazon support about my refund for the returned laptop
Assistant: Three emails from Amazon Support: return received, refund approved and processing, and refund completed. The refund should appear in your account within three to five business days. Would you like me to verify or draft a follow up?
Title: Amazon Refund Status Emails
`;

const chatTitler = async (socket: WebSocket, userPrompt: string, assistantResponse: string): Promise<any> => {
    try {
        logger.info('Chat Titler Agent Called');
        const prompt = `
        User: ${userPrompt} \n
        Assistant: ${assistantResponse}
        `
        const response = await lmsGenerate({ model: titlerModel, system: systemPrompt, prompt, intent: 'titling', temperature });
        return response;
    } catch (err) {
        handleErrorUtil(filePath, 'chat', err, 'Sending Prompt for Chat Titling');
        return null;
    }
};

export default chatTitler;