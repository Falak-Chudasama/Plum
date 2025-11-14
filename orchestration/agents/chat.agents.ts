import lmsGenerate from "../adapters/lms.adapters";
import constants from "../constants/constants";
import globals from "../globals/globals";
import { handleErrorUtil } from "../utils/errors.utils";
import logger from "../utils/logger.utils";
import chatTitler from "./chatTitler.agents";
import parseIntent from "./intentParser.agents";
import msAPIs from "../apis/ms.apis";
import mailCrafter from "./mailCrafter.agent";
import type { UserObjType } from "../types/types";
import fetchDb from "./fetchDb.agents";
import lmsModelOps from "../adapters/lms.models";
import { query } from "winston";

// TODO: Add context to previous response too and prompt for better understanding

const filePath = '/agents/chat.agents.ts';

const defaultModel = constants.lmsModels.llm.llamaHermes;
const temperature = 0;

let generalSystemPrompt = ``;

const chat = async (socket: WebSocket, prompt: string, user: UserObjType, model: string = defaultModel, chatCount: number): Promise<void> => {
    try {
        logger.info('Chat Agent Called');

        globals.userObj = user;

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
            }).join('\n')}\nYour Previously Crafted Mail(s): ${context.map((c) => {
                if (c.metadata.role === 'mail_crafter') return c.text + '\n'
            }).join('\n')}
            `;
        } else {
            await msAPIs.chatDelAll();
        }

        if (intent.intent === 'craft_email') {
            generalSystemPrompt = `
                The user has just asked you to craft an email.

                Your role:
                You are Plum — a capable, confident assistant who takes user requests seriously. You do NOT generate or preview the email content. Instead, your only job is to reassure the user that their email request is fully understood and being taken care of by you personally.

                Tone and style:
                - Speak as if YOU are crafting the email yourself (do NOT mention any “other agent” or “Mail Crafter”).
                - Be concise, confident, and natural — show the user that their request matters and is being handled.
                - Never mention email generation, background processes, or system tasks.
                - Never include or hint at the email body, structure, or summary.
                - Sound human — not robotic or scripted.

                Examples of good responses:
                - “Got it. I've understood everything, on it now...”
                - “Understood. I've taken note of all your details, leave this to me...”
                - “All set. I'm handling it exactly as you described...”

                Examples of what NOT to do: 
                - Don’t mention ‘Mail Crafter agent’, ‘email generation’, ‘in progress’, or ‘background process’.
                - Don’t show or summarize the email.
                - Don’t use JSON, placeholders, or meta talk.

                Your entire response should be a single short sentence confirming confident understanding and execution.
            `;
            await lmsGenerate({ socket, model, prompt, system: generalSystemPrompt, temperature, stream: true });
            try {
                const craftedEmail = await mailCrafter(socket, prompt, model)
                globals.mostRecentCraftedMail = craftedEmail;

                socket.send(JSON.stringify({
                    type: 'SYSTEM',
                    subtype: 'EMAIL',
                    message: 'Email has been crafted',
                    email: {
                        ...craftedEmail,
                        from: globals.userObj.email
                    },
                    done: true,
                    success: true,
                }));

                socket.send(JSON.stringify({
                    type: 'RESPONSE',
                    done: true,
                    success: true
                }))
            } catch (err) {
                if (err.message === "Could not Craft Email") {
                    socket.send(JSON.stringify({
                        type: 'ERROR',
                        subtype: 'MAIL',
                        done: true,
                        success: false
                    }));
                }
            }
        } else if (intent.intent === 'fetch_db') {
            try {
                generalSystemPrompt = `
                The user has just asked you to fetch or filter information from their data.

                Your role:
                You are Plum, a capable, confident assistant who interprets the user’s request and ensures the correct database query is created and handled. You do NOT show the query, explain the logic, or reveal anything about database operations. Your only job is to reassure the user that their request is fully understood and being taken care of.

                Tone and style:
                - Speak as if YOU are personally handling the data retrieval.
                - Be concise, confident, and natural. Show the user that their request is clearly understood and already in motion.
                - Never mention queries, databases, MongoDB, filters, execution, or any technical steps.
                - Never describe or hint at the data structure, fields, or how the result will be fetched.
                - Sound human, not procedural.

                Examples of good responses:
                - "Understood. I’ll get the exact information you’re looking for."
                - "Got it. I know what you need, let me take care of this."
                - "All clear. I’m retrieving that for you now."

                Examples of what NOT to do:
                - Do not mention query generation, MongoDB, data filtering, or processing.
                - Do not show or summarize the query.
                - Do not use JSON, technical language, or meta explanations.

                Your entire response should be a single short sentence confirming confident understanding and execution.
                `;

                await lmsGenerate({ socket, model, prompt, system: generalSystemPrompt, temperature, stream: true });

                socket.send(JSON.stringify({
                    type: 'INFO',
                    subtype: 'QUERY',
                    message: 'Query is being generated & run...',
                    done: false
                }));

                const result = await fetchDb(socket, prompt);

                socket.send(JSON.stringify({
                    type: 'SYSTEM',
                    subtype: 'QUERY',
                    message: 'Query was Generated and Run.',
                    query: globals.mostRecentQuery,
                    isSuccess: result.length > 0,
                    result,
                    resultCount: result.length,
                    done: true,
                    success: true
                }));
            } catch (err) {
                socket.send(JSON.stringify({
                    type: 'SYSTEM',
                    subtype: 'QUERY',
                    query: '',
                    isSuccess: false,
                    resultCount: 0
                }));
            }
            lmsModelOps.unloadLMSModel('*');
            lmsModelOps.loadLMSModel(defaultModel);
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
                content: JSON.stringify(globals.mostRecentCraftedMail),
                meta: { role: "mail_crafter" }
            })
        } else if (intent.intent === 'fetch_db') {
            contextMessages.push({
                content: JSON.stringify(globals.mostRecentQueryResult),
                meta: { role: "db_fetcher" }
            });
        }

        if (chatCount === 0) {
            const title = await chatTitler(socket, globals.mostRecentPrompt, globals.mostRecentResponse);
            socket.send(JSON.stringify({
                type: 'SYSTEM',
                subtype: 'TITLE',
                message: 'Chat Title Generated',
                title,
                done: true,
                success: true
            }));
        }

        socket?.send(JSON.stringify({ type: "RESPONSE", message: "\n<RESPONSE_ENDED>", success: true, done: true }));
        await msAPIs.chatEmbed(contextMessages);
    } catch (err) {
        handleErrorUtil(filePath, 'chat', err, 'Sending user Prompt');
        socket?.send(JSON.stringify({ type: "RESPONSE", message: "\n<RESPONSE_ENDED>", success: false, done: true }));
    }
};

export default chat;