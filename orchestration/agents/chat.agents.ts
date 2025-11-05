import lmsGenerate from "../adapters/lms.adapters";
import constants from "../constants/constants";
import { handleErrorUtil } from "../utils/errors.utils";
import logger from "../utils/logger.utils";

const filePath = '/agents/chat.agents.ts';

const defaultModel = constants.lmsModels.llm.llamaHermes;
const temperature = 0;

const systemPrompt = '';

const chat = async (socket: WebSocket, prompt: string, model: string = defaultModel): Promise<void> => {
    try {
        logger.info('Chat Agent Called');
        await lmsGenerate({ socket, model, prompt, system: systemPrompt, temperature, stream: true });
    } catch (err) {
        handleErrorUtil(filePath, 'chat', err, 'Sending user Prompt');
    }
};

export default chat;