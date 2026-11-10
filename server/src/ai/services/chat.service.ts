import WebSocket from "ws";
import basketClient from "../basket.client";
import { INTENT_GRAMMAR, parseIntentOutput, ChatIntent } from "../grammars/intent.grammar";
import { CHAT_TITLE_GRAMMAR, parseChatTitle } from "../grammars/chatTitle.grammar";
import { craftEmail } from "./emailCrafter.service";
import { fetchDbEmails, UnifiedEmail } from "./dbFetcher.service";
import { retrieveRelevantContextNotes, RetrievedNote } from "./contextNoteRag.service";
import { resolveUserIdentity } from "../../utils/userResolver.utils";
import Chats from "../../models/chat";
import logger from "../../utils/logger.utils";

export interface ChatUserContext {
    email: string;
    name?: string;
    lastName?: string;
}

export interface ChatMessageSender {
    send: (payload: any) => void;
    readyState?: number;
    isOpen?: () => boolean;
    activeChatId?: string | null;
}

export interface ChatProcessOptions {
    prompt: string;
    chatCount: number;
    user: ChatUserContext;
    chatId?: string | null;
    socket: ChatMessageSender;
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
        try {
            if (typeof (socket as any).isOpen === 'function') {
                if ((socket as any).isOpen()) {
                    socket.send(payload);
                }
            } else if (typeof (socket as any).readyState === 'number') {
                if ((socket as any).readyState === WebSocket.OPEN) {
                    socket.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
                }
            } else {
                socket.send(payload);
            }
        } catch (err: any) {
            logger.warn(`[ChatService] Failed to send message: ${err.message}`);
        }
    };

    let craftedResult: any = null;
    let dbFetchResult: any = null;

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

        // Step 2: Resolve User Identity & Personal RAG Context Notes
        const resolvedUser = await resolveUserIdentity(userEmail);
        const fullName = resolvedUser.fullName || [user.name, user.lastName].filter(Boolean).join(" ");

        logger.info(`[ChatService] Resolved user identity for ${userEmail}: fullName="${fullName}"`);

        // Hybrid RAG Retrieval across user's context notes
        const relevantNotes = await retrieveRelevantContextNotes(prompt, userEmail, 3);
        if (relevantNotes.length > 0) {
            safeSend({
                type: "SYSTEM",
                subtype: "RAG_CONTEXT",
                message: "Retrieved relevant context notes via Hybrid RAG",
                notes: relevantNotes.map((n) => ({
                    id: n.id,
                    title: n.title,
                    content: n.content,
                    denseScore: n.denseScore,
                    bm25Score: n.bm25Score,
                    rrfScore: n.rrfScore,
                })),
                success: true,
            });
        }

        // Conversation history context from Database (strictly account-isolated)
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

        // Step 3: Construct Personalized System Prompt
        let systemPrompt = `You are Plum, a fast, concise, intelligent personal email and productivity assistant powered by Basket AI.
You are assisting ${fullName || "the user"} (${userEmail}).
User's Full Name: ${fullName || userEmail}.
Always recognize the user by their full name (${fullName || userEmail}).
When drafting outbound emails on the user's behalf, ALWAYS sign off with the user's real name: ${fullName || userEmail} (never use placeholder text like '[Your Name]').
Respond without emojis unless requested. Keep responses direct, helpful, and focused on essential information.
Format responses cleanly using Markdown: use headers (###), bullet points (- or *), bold text for emphasis, and proper line breaks between paragraphs. Never smash items or sentences together.`;

        if (relevantNotes.length > 0) {
            systemPrompt += `\n\n=== RELEVANT CONTEXT NOTES (Retrieved from user's memory via Hybrid RAG) ===\n` +
                relevantNotes.map((n, i) => `[Note ${i + 1}] "${n.title}":\n${n.content}`).join("\n\n") +
                `\n===================================================================================\n` +
                `Use the facts in these context notes (e.g. contact relationships, project deadlines, preferences) to accurately inform your responses.`;
        }

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

            const crafted = await craftEmail(
                prompt,
                conversationContext,
                userEmail,
                fullName,
                undefined,
                undefined,
                undefined,
                relevantNotes
            );
            craftedResult = crafted;

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
            dbFetchResult = dbResult;

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

            const emailSummaries = dbResult.result.slice(0, 6).map((e, idx) => {
                if (e.direction === "outbound") {
                    const toStr = Array.isArray(e.to) ? e.to.join(", ") : e.to;
                    return `[${idx + 1}] (Outbound - ${e.status || "sent"}) To: ${toStr} | Subject: "${e.subject}" | Date: ${e.createdAt || "recent"} | Preview: ${e.snippet?.slice(0, 100) || "none"}`;
                } else {
                    return `[${idx + 1}] (Inbound) From: ${e.senderName || e.senderEmail} | Subject: "${e.subject}" | Date: ${e.createdAt || "recent"} | Preview: ${e.snippet?.slice(0, 100) || "none"}`;
                }
            }).join("\n");

            const queryContinuationPrompt = `${systemPrompt}
You have retrieved ${dbResult.resultCount} email(s) from the database matching the user's request.
Results summary:
${emailSummaries || "No matching emails found."}

Format the response cleanly in Markdown:
- Group or list emails using numbered items (1. 2. 3.) or bullet points (*).
- For each email, put key fields like Subject, Sender/Recipient, and Date/Content on clear, readable lines with bold markers.
- Always include an empty line between distinct emails.
- If results are found, mention whether they are sent/outbound or inbound received emails and summarize the key information.
- Provide a concise 'Key Takeaways' section at the end.
- If no results were found, let them know clearly and suggest adjusting keywords or filters.
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
        let generatedTitle = "";
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
                generatedTitle = parseChatTitle(rawTitle);
                logger.info(`[ChatService] Generated title: "${generatedTitle}"`);
                safeSend({
                    type: "SYSTEM",
                    subtype: "TITLE",
                    message: "Chat Title Generated",
                    title: { title: generatedTitle },
                    done: true,
                    success: true,
                });
            } catch (err: any) {
                logger.warn(`[ChatService] Title generation failed: ${err.message}`);
                generatedTitle = "New Conversation";
                safeSend({
                    type: "SYSTEM",
                    subtype: "TITLE",
                    message: "Chat Title Generated",
                    title: { title: generatedTitle },
                    done: true,
                    success: true,
                });
            }
        }

        // Step 5: Save conversation turn to MongoDB
        let savedChatId = chatId;
        let finalTitle = generatedTitle;

        try {
            const userPromptEntry = {
                prompt,
                intention: {
                    intent: parsedIntent.intent,
                    confidence: parsedIntent.confidence,
                },
                chatCount,
            };

            const responseEntry: any = {
                response: fullAssistantResponse,
                thought: "<no_thoughts>",
                chatCount,
                modelResponded: "basket",
            };

            if (craftedResult) {
                responseEntry.craftedMail = {
                    from: userEmail,
                    to: Array.isArray(craftedResult.to) ? craftedResult.to : [craftedResult.to].filter(Boolean),
                    cc: craftedResult.cc || [],
                    bcc: craftedResult.bcc || [],
                    subject: craftedResult.subject || "No Subject",
                    body: craftedResult.body || "",
                    category: craftedResult.category || ["General"],
                    status: "unsaved",
                };
            }

            if (dbFetchResult) {
                responseEntry.query = {
                    query: typeof dbFetchResult.query === 'string' ? dbFetchResult.query : JSON.stringify(dbFetchResult.query),
                    isSuccess: Boolean(dbFetchResult.isSuccess),
                    result: dbFetchResult.result || [],
                };
            }

            if (chatId) {
                const existing = await Chats.findOne({ _id: chatId, email: userEmail });
                if (existing) {
                    existing.userPrompts.push(userPromptEntry as any);
                    existing.responses.push(responseEntry as any);
                    existing.messageCount = (existing.messageCount || 0) + 1;
                    existing.lastMessageAt = new Date();
                    await existing.save();
                    savedChatId = existing._id.toString();
                    finalTitle = existing.title;
                }
            } else {
                const newChat = await Chats.create({
                    title: generatedTitle || "New Conversation",
                    email: userEmail,
                    userPrompts: [userPromptEntry],
                    responses: [responseEntry],
                    messageCount: 1,
                    lastMessageAt: new Date(),
                });
                savedChatId = newChat._id.toString();
                finalTitle = newChat.title;
            }

            if ((socket as any).activeChatId !== undefined) {
                (socket as any).activeChatId = savedChatId;
            }
        } catch (dbErr: any) {
            logger.warn(`[ChatService] Failed to persist chat turn to DB: ${dbErr.message}`);
        }

        // Step 6: Complete Response
        safeSend({
            type: "RESPONSE_COMPLETE",
            chatId: savedChatId,
            title: finalTitle,
            done: true,
            success: true,
        });

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

