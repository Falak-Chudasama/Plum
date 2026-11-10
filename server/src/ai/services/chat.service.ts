import WebSocket from "ws";
import basketClient from "../basket.client";
import { INTENT_GRAMMAR, parseIntentOutput, ChatIntent } from "../grammars/intent.grammar";
import { CHAT_TITLE_GRAMMAR, parseChatTitle } from "../grammars/chatTitle.grammar";
import { craftEmail } from "./emailCrafter.service";
import { fetchDbEmails } from "./dbFetcher.service";
import Chats from "../../models/chat";
import logger from "../../utils/logger.utils";

export interface ChatUserContext {
    email: string;
    name?: string;
    lastName?: string;
}

export interface ChatProcessOptions {
    prompt: string;
    chatCount: number;
    user: ChatUserContext;
    chatId?: string | null;
    socket: WebSocket;
    abortSignal?: AbortSignal;
}

const GENERAL_SYSTEM_PROMPT = `
You are Plum, a fast, concise, intelligent personal email and productivity assistant.
Respond without emojis unless requested. Keep responses direct, helpful, and focused on essential information.
`.trim();

/**
 * Handles an incoming chat prompt end-to-end for an authenticated user.
 */
export async function handleChatPrompt(options: ChatProcessOptions): Promise<void> {
    const { prompt, chatCount, user, chatId, socket } = options;
    const userEmail = user.email;

    logger.info(`[ChatService] Received prompt for user=${userEmail} chatCount=${chatCount} chatId=${chatId || "new"}`);

    const safeSend = (payload: any) => {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(payload));
        }
    };

    try {
        // Step 1: Intent Classification via Basket
        logger.info(`[ChatService] Classifying intent for user=${userEmail}`);
        let parsedIntent: { intent: ChatIntent; confidence: number } = { intent: "general", confidence: 0.9 };

        try {
            const rawIntent = await basketClient.complete({
                messages: [
                    {
                        role: "system",
                        content: `Classify the user prompt into one intent:
- 'craft_email' if the user asks to compose, draft, rewrite, write, or reply to an email.
- 'fetch_db' if the user asks to search, find, check, view, list, or retrieve past emails or notifications.
- 'general' for standard conversation, questions, or other tasks.
Output ONLY the intent identifier.`
                    },
                    { role: "user", content: prompt },
                ],
                grammar: INTENT_GRAMMAR,
                temperature: 0.0,
                max_tokens: 20,
            });
            parsedIntent = parseIntentOutput(rawIntent);
        } catch (err: any) {
            logger.warn(`[ChatService] Intent parsing fallback to general: ${err.message}`);
        }

        logger.info(`[ChatService] Intent determined: ${parsedIntent.intent} (${parsedIntent.confidence})`);
        safeSend({
            type: "SYSTEM",
            subtype: "INTENT",
            message: "Parsed Intent for the Prompt",
            intent: parsedIntent,
            success: true,
        });

        // Step 2: Context Retrieval from Database (strictly account-isolated)
        let conversationContext = "";
        if (chatId) {
            try {
                const existingChat = await Chats.findOne({ _id: chatId, email: userEmail });
                if (existingChat) {
                    const recentPrompts = existingChat.userPrompts.slice(-3).map(p => `User: ${p.prompt}`).join("\n");
                    const recentResponses = existingChat.responses.slice(-3).map(r => `Plum: ${r.response}`).join("\n");
                    conversationContext = `${recentPrompts}\n${recentResponses}`.trim();
                }
            } catch (err: any) {
                logger.warn(`[ChatService] Could not fetch chat context for id=${chatId}: ${err.message}`);
            }
        }

        // Step 3: Intent Branching
        let systemPrompt = GENERAL_SYSTEM_PROMPT;
        if (conversationContext) {
            systemPrompt += `\n\nRecent Conversation:\n${conversationContext}`;
        }

        let fullAssistantResponse = "";

        if (parsedIntent.intent === "craft_email") {
            safeSend({
                type: "INFO",
                subtype: "EMAIL",
                message: "Crafting user's email",
                showMessage: "Crafting your email...",
                loading: true,
            });

            const fullName = [user.name, user.lastName].filter(Boolean).join(" ");
            const crafted = await craftEmail(prompt, conversationContext, userEmail, fullName);

            safeSend({
                type: "INFO",
                subtype: "EMAIL",
                message: "Crafted user's email",
                loading: false,
            });

            safeSend({
                type: "SYSTEM",
                subtype: "EMAIL",
                message: "Email has been crafted",
                email: crafted,
                done: true,
                success: true,
            });

            const emailContinuationPrompt = `${systemPrompt}
You have just drafted an email for the user with subject: "${crafted.subject}" to [${crafted.to.join(", ")}].
Briefly and naturally tell the user you've prepared the draft and describe what it accomplishes.
Do NOT restate the whole email body. Keep it concise, professional, and direct.`;

            await basketClient.stream(
                {
                    messages: [
                        { role: "system", content: emailContinuationPrompt },
                        { role: "user", content: prompt },
                    ],
                    temperature: 0.3,
                },
                {
                    onToken: (token) => {
                        fullAssistantResponse += token;
                        safeSend({
                            type: "RESPONSE",
                            response: token,
                            model: "basket",
                            done: false,
                        });
                    },
                }
            );

        } else if (parsedIntent.intent === "fetch_db") {
            safeSend({
                type: "INFO",
                subtype: "QUERY",
                message: "Query is being generated & run",
                showMessage: "Fetching from Database...",
                loading: true,
            });

            const dbResult = await fetchDbEmails(prompt, userEmail);

            safeSend({
                type: "INFO",
                subtype: "QUERY",
                message: "Query is generated & run",
                loading: false,
            });

            safeSend({
                type: "SYSTEM",
                subtype: "QUERY",
                message: "Query was Generated and Run.",
                query: dbResult.query,
                isSuccess: dbResult.isSuccess,
                result: dbResult.result,
                resultCount: dbResult.resultCount,
                done: true,
                success: true,
            });

            const queryContinuationPrompt = `${systemPrompt}
You have retrieved ${dbResult.resultCount} email(s) from the database matching the user's request.
Results summary:
${dbResult.result.slice(0, 5).map((e, idx) => `[${idx + 1}] From: ${e.senderName || e.senderEmail} | Subject: ${e.subject}`).join("\n")}

Interpret these results naturally and accurately for the user.
If no results were found, let them know clearly and suggest adjusting keywords or filters.
Do NOT talk about technical MongoDB syntax or collection names.`;

            await basketClient.stream(
                {
                    messages: [
                        { role: "system", content: queryContinuationPrompt },
                        { role: "user", content: prompt },
                    ],
                    temperature: 0.3,
                },
                {
                    onToken: (token) => {
                        fullAssistantResponse += token;
                        safeSend({
                            type: "RESPONSE",
                            response: token,
                            model: "basket",
                            done: false,
                        });
                    },
                }
            );

        } else {
            // General conversation
            await basketClient.stream(
                {
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: prompt },
                    ],
                    temperature: 0.5,
                },
                {
                    onToken: (token) => {
                        fullAssistantResponse += token;
                        safeSend({
                            type: "RESPONSE",
                            response: token,
                            model: "basket",
                            done: false,
                        });
                    },
                }
            );
        }

        // Step 4: Title Generation for First Message in New Chat
        if (chatCount === 0) {
            try {
                logger.info(`[ChatService] Generating title for new chat`);
                const rawTitle = await basketClient.complete({
                    messages: [
                        {
                            role: "system",
                            content: `You are a Chat Title Generator. Produce a concise third-person title (at most 6 words). Return JSON: {"title": "<TITLE>"}. No emojis, no quotes.`
                        },
                        {
                            role: "user",
                            content: `User: ${prompt}\nAssistant: ${fullAssistantResponse.slice(0, 200)}`
                        },
                    ],
                    grammar: CHAT_TITLE_GRAMMAR,
                    temperature: 0.0,
                    max_tokens: 30,
                });
                const titleText = parseChatTitle(rawTitle);
                logger.info(`[ChatService] Generated title: "${titleText}"`);
                safeSend({
                    type: "SYSTEM",
                    subtype: "TITLE",
                    message: "Chat Title Generated",
                    title: { title: titleText },
                    done: true,
                    success: true,
                });
            } catch (err: any) {
                logger.warn(`[ChatService] Title generation failed: ${err.message}`);
                safeSend({
                    type: "SYSTEM",
                    subtype: "TITLE",
                    message: "Chat Title Generated",
                    title: { title: "New Conversation" },
                    done: true,
                    success: true,
                });
            }
        }

        // Step 5: Complete Response
        safeSend({
            type: "RESPONSE",
            message: "\n<RESPONSE_ENDED>",
            done: true,
            success: true,
        });

    } catch (err: any) {
        logger.error(`[ChatService] Chat prompt failed for user=${userEmail}: ${err.message}`);
        safeSend({
            type: "ERROR",
            error: err.message || "Failed to process chat request via Basket",
            done: true,
            success: false,
        });
        safeSend({
            type: "RESPONSE",
            message: "\n<RESPONSE_ENDED>",
            done: true,
            success: false,
        });
    }
}

