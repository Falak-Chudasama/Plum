import lmsGenerate from "../adapters/lms.adapters";
import constants from "../constants/constants";
import globals from "../globals/globals";
import { handleErrorUtil } from "../utils/errors.utils";
import logger from "../utils/logger.utils";
import msAPIs from "../apis/ms.apis";

const filePath = '/agents/chat.agents.ts';

const defaultModel = constants.lmsModels.llm.llamaHermes;
const temperature = 0;

const craftMailSystemPrompt = ``;

const mailCrafter = async (socket: WebSocket, prompt: string, model: string = defaultModel): Promise<void> => {
    try {
        logger.info('Mail Crafter Agent Called');

        await lmsGenerate({ socket, model, prompt, system: craftMailSystemPrompt, intent: 'craft_mail', temperature, stream: false });
    } catch (err) {
        handleErrorUtil(filePath, 'mailCrafter', err, 'Crafting Mail');
    }
};

export default mailCrafter;