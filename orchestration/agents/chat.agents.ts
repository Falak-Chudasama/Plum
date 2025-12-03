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

const filePath = '/agents/chat.agents.ts';

const defaultModel = constants.lmsModels.llm.BEST;
const temperature = 0;

let generalSystemPrompt = `You must respond without emojis. Keep responses concise, direct, and limited to essential information only.`;

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

        let context = ``;

        if (chatCount > 0) {
            const ragResult = await msAPIs.chatSearch(prompt, 10);

            context = `User's Previous Prompt(s): ${ragResult.map((c) => {
                if (c.metadata.role === 'user') return c.text
            }).join('\n')}\nYour Previous Response(s): ${ragResult.map((c) => {
                if (c.metadata.role === 'plum') return c.text + '\n'
            }).join('\n')}\nYour Previously Crafted Mail(s): ${ragResult.map((c) => {
                if (c.metadata.role === 'mail_crafter') return c.text + '\n'
            }).join('\n')}
            `;

            generalSystemPrompt += `Do not greet the user unnecessarily, it is not the first prompt
            `;
            generalSystemPrompt += context;
        } else {
            globals.clearGlobalContext();
        }


        if (intent.intent === 'craft_email') {
            try {
                socket?.send(JSON.stringify({
                    type: 'INFO',
                    subtype: 'EMAIL',
                    message: `Crafting user's email`,
                    showMessage: `Crafting your email...`,
                    loading: true,
                }));

                const craftedEmail = await mailCrafter(socket, prompt, context, model)
                globals.mostRecentCraftedMail = craftedEmail;

                socket?.send(JSON.stringify({
                    type: 'INFO',
                    subtype: 'EMAIL',
                    message: `Crafted user's email`,
                    loading: false,
                }));

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

                generalSystemPrompt += `
                This is the most recent email crafted by you: ${JSON.stringify(globals.mostRecentCraftedMail)}
                `;

                generalSystemPrompt += `
                The email requested by the user has been crafted successfully.

                You must NOT reveal, restate, paraphrase, quote, or summarize the email body or any of its wording.
                You do NOT have access to the email body content directly; you only know the high-level intent and structural purpose of the email.

                Your task:
                Continue the conversation naturally by briefly explaining what type of email you produced and what it accomplishes — without showing or referencing the body in any form.

                Allowed information:
                - Purpose of the email (e.g., a follow-up, complaint, formal request)
                - The tone (formal, polite, concise, assertive)
                - Whether the structure fits the user’s instructions
                - Whether anything seemed missing in the instruction
                - High-level observations about what the email achieves

                Forbidden content:
                - No email sentences, fragments, or rephrased versions
                - No exposure of subject, greeting, closing, or message body
                - No JSON fields, metadata, or internal objects
                - No references to how the email was generated or which system generated it
                - No new greeting or acknowledgement; continue the reply naturally

                Tone:
                Direct, minimal, helpful, and seamless — as if you are continuing the same message thread.

                Your output must be a human-like continuation that describes what you accomplished, without exposing or hinting at any of the actual text inside the email.

                `;
                await lmsGenerate({ socket, model, prompt, system: generalSystemPrompt, temperature, stream: true });

                socket.send(JSON.stringify({
                    type: 'RESPONSE',
                    done: false,
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
                socket?.send(JSON.stringify({
                    type: 'INFO',
                    subtype: 'QUERY',
                    message: `Query is being generated & run`,
                    showMessage: `Fetching from Database...`,
                    loading: true,
                }));
                
                const result = await fetchDb(socket, prompt);
                
                socket?.send(JSON.stringify({
                    type: 'INFO',
                    subtype: 'QUERY',
                    message: `Query is generated & run`,
                    loading: false,
                }));

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

                generalSystemPrompt += `
                This is the Query executed by you: ${JSON.stringify(globals.mostRecentQuery)}
                And this is the Query's result: ${JSON.stringify(globals.mostRecentQueryResult)}
                `

                generalSystemPrompt += `
                The database query has already been executed. You now have full access to:
                - The user’s original request
                - The exact query that was executed
                - The complete query result set

                Your job:
                Provide the user with a clear, factual interpretation of the data. Do not be a yes-man. Do not blindly approve the user’s assumption if the data contradicts it. Your response must reflect what the data actually shows.

                You are not starting a new reply.
                You are continuing your ongoing response naturally, using the query results as additional information the user expects you to interpret.

                How to respond:
                - Give a concise, accurate, human-like explanation of what the results mean.
                - If the user asked for a summary, provide a clean, direct summary.
                - If the user asked for a comparison, ranking, or filtering, apply that logic and explain the outcome.
                - If the user’s assumption is wrong, correct them respectfully with the data.
                - If the data is empty, tell them plainly and guide them on what might be adjusted.

                Rules:
                - Do NOT show the actual query text.
                - Do NOT talk about databases, MongoDB, filters, or any technical details.
                - Do NOT mention internal agents, execution steps, or metadata.
                - Do NOT say “the result contains X fields”; just interpret it naturally.
                - Base every statement strictly on the query result.

                Tone:
                - Confident, neutral, human, analytical.
                - Not sugar-coated, not overly polite.
                - Professional and direct.

                Your answer should directly address the user’s original intent and rely ONLY on the data you were given.
                `;

                await lmsGenerate({ socket, model, prompt, system: generalSystemPrompt, temperature, stream: true });
            } catch (err) {
                socket.send(JSON.stringify({
                    type: 'SYSTEM',
                    subtype: 'QUERY',
                    query: '',
                    isSuccess: false,
                    resultCount: 0
                }));
            }
        } else {
            await lmsGenerate({ socket, model, prompt, system: generalSystemPrompt, temperature, stream: true });
        }

        const contextMessages = [
            {
                content: globals.mostRecentPrompt,
                meta: {
                    role: "user",
                    app: 'plum'
                },
            },
            {
                content: globals.mostRecentResponse,
                meta: {
                    role: "plum",
                    app: 'plum'
                },
            }
        ];

        if (intent.intent === 'craft_email') {
            contextMessages.push({
                content: JSON.stringify(globals.mostRecentCraftedMail),
                meta: {
                    role: "mail_crafter",
                    app: 'plum'
                }
            })
        } else if (intent.intent === 'fetch_db') {
            contextMessages.push({
                // TODO: Instead of passing only the query result, pass entire query along with its result (also return only the ids of the emails that were fetched from db), isSuccess. NOT JUST THE QUERY RESULT
                content: JSON.stringify(globals.mostRecentQueryResult),
                meta: {
                    role: "db_fetcher",
                    app: 'plum'
                }
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