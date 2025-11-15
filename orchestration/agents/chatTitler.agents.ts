import lmsGenerate from "../adapters/lms.adapters";
import constants from "../constants/constants";
import { handleErrorUtil } from "../utils/errors.utils";
import logger from "../utils/logger.utils";

const filePath = '/agents/chatTitler.agents.ts';

const titlerModel = constants.lmsModels.llm.BEST;
const temperature = 0;

const systemPrompt = `
    You are a Chat Title Generator. For each User and Assistant conversation pair, produce a concise title that best represents the conversation and return it as a single valid JSON object and nothing else.

    Output format (exact shape):
    {"title":"<TITLE>"}

    Rules:
    1. The JSON object must be the only output. Do not include commentary, markdown, code fences, or any additional text or fields.
    2. The value of "title" must be a string of at most 7 words (count words by whitespace).
    3. The title must contain no punctuation characters and no line breaks. Use only letters, numbers, and spaces.
    4. Do not include quotes, punctuation, or special characters inside the title string. The JSON must still use double quotes for the value.
    5. Produce a nonempty title. If a concise descriptive title cannot be derived, output a short placeholder that follows the rules above.
    6. Ensure the JSON is valid (double quotes, no trailing commas).
`;

const extractJSON = (text: string): string | null => {
    if (!text) return null;
    const match = text.match(/\{[\s\S]*\}/);
    return match ? match[0].trim() : null;
};

const parseJSONSafe = (jsonText: string): any | null => {
    try {
        return JSON.parse(jsonText);
    } catch {
        return null;
    }
};

const chatTitler = async (socket: WebSocket, userPrompt: string, assistantResponse: string): Promise<any> => {
    logger.info('Chat Titler Agent Called');

    const prompt = `
        User: ${userPrompt}
        Assistant: ${assistantResponse}
    `;

    let attempt = 0;

    while (attempt < 5) {
        attempt++;
        try {
            logger.info(`Attempt ${attempt}: Generating title`);
            const response = await lmsGenerate({
                socket,
                model: titlerModel,
                system: systemPrompt,
                prompt,
                intent: 'titling',
                temperature,
                stream: false
            });

            const rawText = response?.choices?.[0]?.message?.content?.trim() ?? '';
            logger.info(`Titled the Chat: ${rawText}`);

            const jsonCandidate = extractJSON(rawText);
            if (!jsonCandidate) {
                logger.warn('No JSON block detected, retrying...');
                continue;
            }

            const parsed = parseJSONSafe(jsonCandidate);
            if (parsed && parsed.title) {
                logger.info('Successfully parsed title JSON');
                return parsed;
            }

            logger.warn('Failed to parse valid JSON, retrying...');
        } catch (err) {
            handleErrorUtil(filePath, 'chatTitler', err, `Attempt ${attempt} failed`);
        }
    }

    logger.error('All 5 attempts failed to produce valid JSON');
    return { title: 'Untitled Conversation' };
};

export default chatTitler;