import lmsGenerate from "../adapters/lms.adapters";
import constants from "../constants/constants";
import globals from "../globals/globals";
import { handleErrorUtil } from "../utils/errors.utils";
import logger from "../utils/logger.utils";
import chatTitler from "./chatTitler.agents";
import parseIntent from "./intentParser.agents";
import msAPIs from "../apis/ms.apis";
import mailCrafter from "./mailCrafter.agent";

// TODO: Add context to previous response too and prompt for better understanding

const filePath = '/agents/chat.agents.ts';

const defaultModel = constants.lmsModels.llm.llamaHermes;
const temperature = 0;

let generalSystemPrompt = ``;

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

        if (chatCount > 0) {
            const context = await msAPIs.chatSearch(prompt, 10);

            generalSystemPrompt = `User's Previous Prompt(s): ${context.map((c) => {
                if (c.metadata.role === 'user') return c.text
            }).join('\n')}\nYour Previous Response(s): ${context.map((c) => {
                if (c.metadata.role === 'plum') return c.text + '\n'
            }).join('\n')}\nYour Previous Crafted Mail(s): ${context.map((c) => {
                if (c.metadata.role === 'mail_crafter') return c.text + '\n'
            }).join('\n')}
            `;
        }

        if (intent.intent === 'craft_email') {
            // send socket message that mail is being crafted
            // try {
            //     const craftedEmail = await mailCrafter(socket, prompt, model)
            //     // send socket message of crafted mail
            // } catch (err) {
            //     if (err.message === "Could not Craft Email") {
            //         // send socket message that crafting of email failed
            //     }
            // }
        } else if (intent.intent === 'fetch_db') {
            logger.info('FETCH DBBBBBBBBBBBBBBB')
        } else {
            await lmsGenerate({ socket, model, prompt, system: generalSystemPrompt, temperature, stream: true });
        }

        const contextMessages = [
            {
                content: globals.mostRecentPrompt,
                meta: { role: "user" },
            },
            {
                content: globals.mostRecentResponse,
                meta: { role: "plum" },
            }
        ];

        if (intent.intent === 'craft_email') {
            contextMessages.push({
                content: globals.mostRecentCraftedMail,
                meta: { role: "mail_crafter" }
            })
        }

        const title = await chatTitler(socket, globals.mostRecentPrompt, globals.mostRecentResponse);
        
        if (chatCount === 0) {
            await msAPIs.chatDelAll();
            socket.send(JSON.stringify({
                type: 'SYSTEM',
                subtype: 'TITLE',
                message: 'Chat Title Generated',
                title,
                done: true,
                success: true
            }));
        }

        await msAPIs.chatEmbed(contextMessages);
    } catch (err) {
        handleErrorUtil(filePath, 'chat', err, 'Sending user Prompt');
    }
};

export default chat;