import lmsGenerate from "../adapters/lms.adapters";
import constants from "../constants/constants";
import { handleErrorUtil } from "../utils/errors.utils";
import logger from "../utils/logger.utils";
import chatTitler from "./chatTitler.agents";
import parseIntent from "./intentParser.agents";

const filePath = '/agents/chat.agents.ts';

const defaultModel = constants.lmsModels.llm.llamaHermes;
const temperature = 0;

const systemPrompt = '';

const chat = async (socket: WebSocket, prompt: string, model: string = defaultModel, chatCount: number): Promise<void> => {
    try {
        logger.info('Chat Agent Called');

        await parseIntent(prompt);
        // await lmsGenerate({ socket, model, prompt, system: systemPrompt, temperature, stream: true });
        if (chatCount === 0) {
            // chatTitler(socket)
            // ostRecentPrompt, globals.mostRecentResponse);
        }
    } catch (err) {
        handleErrorUtil(filePath, 'chat', err, 'Sending user Prompt');
    }
};

export default chat;