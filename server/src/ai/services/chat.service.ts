import WebSocket from "ws";
import mongoose from "mongoose";
import basketClient, { BasketMessage } from "../basket.client";
import { CHAT_TITLE_GRAMMAR, parseChatTitle } from "../grammars/chatTitle.grammar";
import { retrieveRelevantContextNotes } from "./contextNoteRag.service";
import { resolveUserIdentity } from "../../utils/userResolver.utils";
import { PLUM_AGENT_TOOLS, executePlumTool, PlumToolContext } from "./plumTools.service";
import Chats, { IChatToolEvent } from "../../models/chat";
import Mailbox from "../../models/mailbox.models";
import logger from "../../utils/logger.utils";
import { formatDateTime } from "../../utils/utils";

const MAX_AGENT_STEPS = 5;

function escapeRegex(text: string): string {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

async function resolveActiveMailboxForChat(userEmail: string, requestedMailbox?: string): Promise<string> {
    const normUser = userEmail.toLowerCase().trim();
    if (requestedMailbox && requestedMailbox.trim()) {
        const reqMb = requestedMailbox.toLowerCase().trim();
        if (reqMb === normUser) return reqMb;
        const owned = await Mailbox.findOne({
            userEmail: new RegExp(`^${escapeRegex(normUser)}$`, "i"),
            email: new RegExp(`^${escapeRegex(reqMb)}$`, "i"),
        })
            .select("email")
            .lean();
        if (owned?.email) return owned.email;
    }

    const primary = await Mailbox.findOne({
        userEmail: new RegExp(`^${escapeRegex(normUser)}$`, "i"),
        isPrimary: true,
    })
        .select("email")
        .lean();
    if (primary?.email) return primary.email;

    const first = await Mailbox.findOne({
        userEmail: new RegExp(`^${escapeRegex(normUser)}$`, "i"),
    })
        .select("email")
        .lean();
    return first?.email || normUser;
}

/**
 * Safely resolves an authorized Chat document across the user's account & connected mailboxes.
 */
async function resolveAuthorizedChat(chatId: string, userEmail: string): Promise<any | null> {
    if (!chatId) return null;

    try {
        const queryFilter: any = mongoose.Types.ObjectId.isValid(chatId)
            ? { $or: [{ _id: new mongoose.Types.ObjectId(chatId) }, { session_id: chatId }] }
            : { session_id: chatId };

        const chat = await Chats.findOne(queryFilter);
        if (!chat) return null;

        const normUserEmail = userEmail.toLowerCase().trim();
        const normChatEmail = (chat.email || "").toLowerCase().trim();
        const normChatMailbox = (chat.mailboxEmail || "").toLowerCase().trim();

        // Allow legacy chats without an owner email or direct match
        if (!normChatEmail || normChatEmail === normUserEmail || normChatMailbox === normUserEmail) {
            return chat;
        }

        const mailboxes = await Mailbox.find({
            $or: [
                { userEmail: new RegExp(`^${escapeRegex(normUserEmail)}$`, "i") },
                { email: new RegExp(`^${escapeRegex(normUserEmail)}$`, "i") },
            ],
        })
            .select("email userEmail")
            .lean();

        const authorizedEmails = new Set<string>([normUserEmail]);
        for (const m of mailboxes) {
            if (m.email) authorizedEmails.add(String(m.email).toLowerCase().trim());
            if (m.userEmail) authorizedEmails.add(String(m.userEmail).toLowerCase().trim());
        }

        if (authorizedEmails.has(normChatEmail) || authorizedEmails.has(normChatMailbox)) {
            return chat;
        }
    } catch (err: any) {
        logger.warn(`[ChatService] Error resolving chat authorization id=${chatId}: ${err.message}`);
    }

    return null;
}

export interface ChatUserContext {
    email: string;
    mailboxEmail?: string;
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

const TOOL_STATUS_LABELS: Record<string, string> = {
    search_emails: "Searching emails...",
    read_email: "Reading email...",
    draft_email: "Drafting email...",
    send_email: "Sending email...",
    sync_gmail: "Syncing Gmail...",
    manage_categories: "Updating categories...",
    recategorize_emails: "Categorizing emails...",
    mark_emails_read: "Updating read status...",
    manage_notes: "Updating notes...",
    respond_to_user: "Writing response...",
};

function buildConversationMessages(existingChat: any): BasketMessage[] {
    if (!existingChat) return [];

    if (Array.isArray(existingChat.messages) && existingChat.messages.length > 0) {
        return existingChat.messages
            .filter((m: any) => (m.role === "user" || m.role === "assistant") && m.content)
            .slice(-6)
            .map((m: any) => ({
                role: m.role as "user" | "assistant",
                content: String(m.content).slice(0, 1200),
            }));
    }

    const history: BasketMessage[] = [];
    const prompts = existingChat.userPrompts || [];
    const responses = existingChat.responses || [];
    const startIdx = Math.max(0, Math.max(prompts.length, responses.length) - 3);
    for (let i = startIdx; i < Math.max(prompts.length, responses.length); i++) {
        if (prompts[i]?.prompt) {
            history.push({ role: "user", content: String(prompts[i].prompt).slice(0, 800) });
        }
        if (responses[i]?.response) {
            history.push({ role: "assistant", content: String(responses[i].response).slice(0, 1200) });
        }
    }
    return history;
}

export async function handleChatPrompt(options: ChatProcessOptions): Promise<void> {
    const { prompt, chatCount, user, chatId, socket, abortSignal } = options;
    const userEmail = user.email;

    const safeSend = (payload: any) => {
        try {
            if (typeof (socket as any).isOpen === "function") {
                if ((socket as any).isOpen()) {
                    socket.send(payload);
                }
            } else if (typeof (socket as any).readyState === "number") {
                if ((socket as any).readyState === WebSocket.OPEN) {
                    socket.send(typeof payload === "string" ? payload : JSON.stringify(payload));
                }
            } else {
                socket.send(payload);
            }
        } catch (err: any) {
            logger.warn(`[ChatService] Failed to send message: ${err.message}`);
        }
    };

    const activeMailbox = await resolveActiveMailboxForChat(userEmail, user.mailboxEmail);
    logger.info(`[ChatService] Prompt user=${userEmail} mailbox=${activeMailbox} chatId=${chatId || "new"}`);

    try {
        // 1. Resolve identity & Hybrid RAG context notes
        const resolvedUser = await resolveUserIdentity(activeMailbox || userEmail);
        const fullName = resolvedUser.fullName || [user.name, user.lastName].filter(Boolean).join(" ") || userEmail;

        let relevantNotes = await retrieveRelevantContextNotes(prompt, activeMailbox, 3);
        if (relevantNotes.length === 0 && activeMailbox.toLowerCase() !== userEmail.toLowerCase()) {
            relevantNotes = await retrieveRelevantContextNotes(prompt, userEmail, 3);
        }

        if (relevantNotes.length > 0) {
            safeSend({
                type: "SYSTEM",
                subtype: "RAG_CONTEXT",
                message: "Retrieved relevant context notes",
                notes: relevantNotes.map((n) => ({
                    id: n.id,
                    title: n.title,
                    content: n.content,
                    denseScore: n.denseScore,
                    bm25Score: n.bm25Score,
                })),
                success: true,
            });
        }

        // 2. Load existing chat history
        let existingChat: any = null;
        if (chatId) {
            existingChat = await resolveAuthorizedChat(chatId, userEmail);
        }
        const historyMessages = buildConversationMessages(existingChat);
        const conversationContext = historyMessages.map((m) => `${m.role === "user" ? "User" : "Plum"}: ${m.content}`).join("\n");

        const nowStr = new Date().toLocaleString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

        const notesContextBlock =
            relevantNotes.length > 0
                ? `\n\nRELEVANT CONTEXT NOTES:\n${relevantNotes.map((n, i) => `[${i + 1}] ${n.title}: ${n.content}`).join("\n")}`
                : "";

        // 3. Multi-step Tool Calling Loop (Basket GBNF tool engine)
        const agentSystemPrompt = `You are Plum, an executive AI email agent acting on behalf of ${fullName} (${activeMailbox}).
Current date/time: ${nowStr}.
Active mailbox: ${activeMailbox} (account owner: ${userEmail}).

You have tools to inspect and execute real actions in Plum:
- search_emails: Find/list/summarize inbound, sent, or draft emails (supports date_range='today', unread_only, query, category).
- read_email: Read full email body by ID.
- draft_email: Write or refine an email draft (and optionally save_to_drafts=true).
- send_email: Actually send an email via Gmail ONLY when the user explicitly asked to send AND you have the recipient email address.
- sync_gmail: Pull new emails from Gmail and auto-categorize them.
- manage_categories: List, create, update, or delete custom email categories.
- recategorize_emails: Auto-categorize emails or tag a specific email.
- mark_emails_read: Mark one or all unread emails as read.
- manage_notes: Save, list, search, or delete personal context notes.
- respond_to_user: Call when ready to answer the user (for general questions or after tool calls finish).

Rules:
1. Never invent email contents, senders, or action outcomes. Always call tools first when email data or workspace mutations are needed.
2. When summarizing today's mail or checking emails, call search_emails first.
3. If the user asks to remember a personal fact/contact/preference, call manage_notes(action='create').
4. If the user asks to send an email to someone by name/role without an address, check notes or search_emails first to find their email address.
5. Call respond_to_user as soon as all requested tasks are complete.${notesContextBlock}`;

        const agentMessages: BasketMessage[] = [
            { role: "system", content: agentSystemPrompt },
            ...historyMessages,
            { role: "user", content: prompt },
        ];

        const toolContext: PlumToolContext = {
            userEmail,
            activeMailbox,
            fullName,
            relevantNotes,
            conversationContext,
        };

        const toolEvents: IChatToolEvent[] = [];
        const executedActionsSummary: string[] = [];
        let lastCraftedMail: any = null;

        for (let step = 0; step < MAX_AGENT_STEPS; step++) {
            if (abortSignal?.aborted) break;

            safeSend({
                type: "INFO",
                message: step === 0 ? "Thinking..." : "Working...",
                showMessage: step === 0 ? "Thinking..." : "Working...",
                loading: true,
            });

            let toolCall = null;
            try {
                toolCall = await basketClient.callTool({
                    messages: agentMessages,
                    tools: PLUM_AGENT_TOOLS,
                    temperature: 0,
                    max_tokens: 450,
                    repeat_penalty: 1.15,
                    signal: abortSignal,
                });
            } catch (err: any) {
                if (abortSignal?.aborted || err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
                    throw err;
                }
                logger.warn(`[ChatService] Tool call error at step ${step + 1}: ${err.message}`);
                break;
            }

            if (!toolCall || !toolCall.name) {
                break;
            }

            if (toolCall.name === "respond_to_user") {
                break;
            }

            const statusMsg = TOOL_STATUS_LABELS[toolCall.name] || `Running ${toolCall.name}...`;
            safeSend({
                type: "INFO",
                message: statusMsg,
                showMessage: statusMsg,
                loading: true,
            });

            const execResult = await executePlumTool(toolCall.name, toolCall.arguments, toolContext);

            const toolEvent: IChatToolEvent = {
                tool: toolCall.name,
                label: execResult.label,
                summary: execResult.summary,
                success: execResult.success,
            };
            toolEvents.push(toolEvent);

            if (execResult.craftedMail) {
                lastCraftedMail = execResult.craftedMail;
                safeSend({
                    type: "SYSTEM",
                    subtype: "EMAIL",
                    message: execResult.label,
                    email: execResult.craftedMail,
                    done: true,
                    success: true,
                });
            }

            safeSend({
                type: "SYSTEM",
                subtype: "TOOL_RESULT",
                tool: toolCall.name,
                label: execResult.label,
                summary: execResult.summary,
                success: execResult.success,
                categoriesChanged: Boolean(execResult.categoriesChanged),
                notesChanged: Boolean(execResult.notesChanged),
                emailsChanged: Boolean(execResult.emailsChanged),
            });

            const boundedData = JSON.stringify(execResult.data).slice(0, 6000);
            executedActionsSummary.push(`Tool \`${toolCall.name}\` (${execResult.success ? "success" : "failed"}): ${boundedData}`);

            agentMessages.push({
                role: "assistant",
                content: "",
                tool_calls: [
                    {
                        id: toolCall.id || `call_${step}`,
                        type: "function",
                        function: {
                            name: toolCall.name,
                            arguments: toolCall.arguments,
                        },
                    },
                ],
            });
            agentMessages.push({
                role: "tool",
                tool_call_id: toolCall.id || `call_${step}`,
                content: boundedData,
            });

            if (execResult.terminate) {
                break;
            }
        }

        if (abortSignal?.aborted) {
            return;
        }

        // 4. Stream Final Markdown Response
        safeSend({
            type: "INFO",
            message: "Composing reply...",
            showMessage: "Composing reply...",
            loading: true,
        });

        let responseSystemPrompt = `You are Plum, a crisp, helpful personal email and productivity assistant for ${fullName} (${activeMailbox}).
Current date/time: ${nowStr}.
Style guidelines:
- Be concise, direct, and well-structured using clean Markdown (headings, bullet lists, bold labels).
- Do not use emojis unless requested.
- Never fabricate email subjects, senders, dates, or action results. Only state facts present in the tool results and context below.${
            lastCraftedMail
                ? "\n- A draft email card is attached below; briefly summarize it and mention the user can edit, save, or send it directly from the card (do NOT repeat the full body verbatim)."
                : ""
        }
- If an action succeeded (created category, synced emails, marked read, sent email, saved note), clearly confirm what was done.`;

        if (notesContextBlock) {
            responseSystemPrompt += notesContextBlock;
        }

        if (executedActionsSummary.length > 0) {
            responseSystemPrompt += `\n\nEXECUTED TOOL RESULTS:\n${executedActionsSummary.join("\n\n")}`;
        }

        let fullAssistantResponse = "";
        await basketClient.stream(
            {
                messages: [
                    { role: "system", content: responseSystemPrompt },
                    ...historyMessages,
                    { role: "user", content: prompt },
                ],
                temperature: 0.3,
                signal: abortSignal,
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

        if (abortSignal?.aborted) {
            return;
        }

        // 5. Title Generation for New/Untitled Chat
        let generatedTitle = "";
        const isUntitled =
            !existingChat ||
            !existingChat.title ||
            existingChat.title === "New Chat" ||
            existingChat.title === "New Conversation" ||
            existingChat.title === "Untitled Conversation";

        if (isUntitled) {
            try {
                const rawTitle = await basketClient.complete({
                    messages: [
                        {
                            role: "system",
                            content: `You are a Chat Title Generator. Produce a concise 2-5 word title. Return JSON: {"title": "<TITLE>"}. No emojis, no quotes.`,
                        },
                        {
                            role: "user",
                            content: `User: ${prompt}\nAssistant: ${fullAssistantResponse.slice(0, 200)}`,
                        },
                    ],
                    grammar: CHAT_TITLE_GRAMMAR,
                    temperature: 0.0,
                    max_tokens: 30,
                });
                generatedTitle = parseChatTitle(rawTitle);
                safeSend({
                    type: "SYSTEM",
                    subtype: "TITLE",
                    message: "Chat Title Generated",
                    title: { title: generatedTitle },
                    done: true,
                    success: true,
                });
            } catch (titleErr: any) {
                logger.warn(`[ChatService] Title generation fallback: ${titleErr.message}`);
                generatedTitle = prompt.slice(0, 42).trim() || "New Chat";
            }
        }

        // 6. Persist conversation turn atomically into Chats.messages
        let savedChatId = existingChat ? existingChat._id.toString() : chatId || undefined;
        let finalTitle = generatedTitle || existingChat?.title || "New Chat";
        const nowFormatted = formatDateTime();

        try {
            const userMsgEntry = {
                role: "user" as const,
                content: prompt,
                created_at: nowFormatted,
            };

            const assistantMsgEntry: any = {
                role: "assistant" as const,
                content: fullAssistantResponse,
                created_at: formatDateTime(),
            };
            if (lastCraftedMail) {
                assistantMsgEntry.craftedMail = lastCraftedMail;
            }
            if (toolEvents.length > 0) {
                assistantMsgEntry.toolEvents = toolEvents;
            }
            if (relevantNotes.length > 0) {
                assistantMsgEntry.ragNotes = relevantNotes.map((n) => ({
                    id: n.id,
                    title: n.title,
                    denseScore: n.denseScore,
                    bm25Score: n.bm25Score,
                }));
            }

            if (existingChat) {
                const updateDoc: any = {
                    $push: {
                        messages: { $each: [userMsgEntry, assistantMsgEntry] },
                    },
                    $inc: { messageCount: 1 },
                    $set: {
                        updated_at: nowFormatted,
                        lastMessageAt: new Date(),
                        mailboxEmail: activeMailbox,
                        ...(!existingChat.email ? { email: userEmail } : {}),
                    },
                };

                if (generatedTitle && isUntitled) {
                    updateDoc.$set.title = generatedTitle;
                    finalTitle = generatedTitle;
                }

                const updated = await Chats.findByIdAndUpdate(existingChat._id, updateDoc, { new: true });
                savedChatId = existingChat._id.toString();
                if (updated?.title) finalTitle = updated.title;
            } else {
                const newId = new mongoose.Types.ObjectId();
                const newChat = await Chats.create({
                    _id: newId,
                    session_id: newId.toString(),
                    title: generatedTitle || prompt.slice(0, 42).trim() || "New Chat",
                    application: "plum",
                    email: userEmail,
                    mailboxEmail: activeMailbox,
                    messages: [userMsgEntry, assistantMsgEntry],
                    messageCount: 1,
                    lastMessageAt: new Date(),
                    created_at: nowFormatted,
                    updated_at: nowFormatted,
                });
                savedChatId = newChat._id.toString();
                finalTitle = newChat.title;
            }

            if (socket) {
                (socket as any).activeChatId = savedChatId;
            }
        } catch (dbErr: any) {
            logger.error(`[ChatService] Failed to persist chat turn: ${dbErr.message}`);
        }

        // 7. Complete Response
        safeSend({
            type: "RESPONSE_COMPLETE",
            chatId: savedChatId,
            title: finalTitle,
            done: true,
            success: true,
        });
    } catch (err: any) {
        if (abortSignal?.aborted || err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
            logger.info(`[ChatService] Request aborted for user=${userEmail}`);
            return;
        }
        logger.error(`[ChatService] Chat prompt failed for user=${userEmail}: ${err.message}`);
        safeSend({
            type: "ERROR",
            error: err.message || "Failed to process chat request via Basket",
            done: true,
            success: false,
        });
    }
}
