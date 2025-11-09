import lmsGenerate from "../adapters/lms.adapters";
import constants from "../constants/constants";
import globals from "../globals/globals";
import { handleErrorUtil } from "../utils/errors.utils";
import logger from "../utils/logger.utils";
import chatTitler from "./chatTitler.agents";
import parseIntent from "./intentParser.agents";

const filePath = '/agents/chat.agents.ts';

const defaultModel = constants.lmsModels.llm.llamaHermes;
const temperature = 0;

const generalSystemPrompt = ``;
const fetchDBSystemPrompt = ``;
const craftMailSystemPrompt = ``;

// Send intent and title via socket
const chat = async (socket: WebSocket, prompt: string, model: string = defaultModel, chatCount: number): Promise<void> => {
    try {
        logger.info('Chat Agent Called');

        const intent = await parseIntent(prompt);
        socket.send(JSON.stringify({
            type: 'SYSTEM',
            subtype: 'INTENT',
            message: `Parsed Intent for the Prompt`,
            intent,
            success: true
        }));
        await lmsGenerate({ socket, model, prompt, system: generalSystemPrompt, temperature, stream: true });
        if (chatCount === 0) {
            const title = await chatTitler(socket, globals.mostRecentPrompt, globals.mostRecentResponse);
            socket.send(JSON.stringify({
                type: 'SYSTEM',
                subtype: 'TITLE',
                message: `Generated Title for the Conversation`,
                title,
                success: true
            }));
        }
    } catch (err) {
        handleErrorUtil(filePath, 'chat', err, 'Sending user Prompt');
    }
};

export default chat;