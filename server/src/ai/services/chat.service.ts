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
    turnId?: string;
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

function formatAssistantTurnContext(content: string, craftedMail?: any, toolEvents?: any[]): string {
    const parts: string[] = [];
    const text = String(content || "").trim();
    if (text) {
        parts.push(text.slice(0, 2200));
    }
    if (craftedMail && (craftedMail.subject || craftedMail.body || craftedMail.to)) {
        const recipients = Array.isArray(craftedMail.to)
            ? craftedMail.to.join(", ")
            : String(craftedMail.to || "");
        const status = craftedMail.status || "crafted";
        const bodySnippet = String(craftedMail.body || "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 700);
        parts.push(
            `[Attached email draft (${status}): To: ${recipients || "unspecified"} | Subject: ${craftedMail.subject || "No Subject"} | Body: ${bodySnippet}]`
        );
    }
    if (Array.isArray(toolEvents) && toolEvents.length > 0) {
        const toolLine = toolEvents
            .slice(0, 6)
            .map((t: any) => `${t.tool}(${t.success ? "ok" : "failed"}${t.summary ? `: ${String(t.summary).slice(0, 120)}` : ""})`)
            .join("; ");
        parts.push(`[Tools: ${toolLine}]`);
    }
    return parts.join("\n").slice(0, 2800);
}

function buildConversationMessages(existingChat: any): BasketMessage[] {
    if (!existingChat) return [];

    if (Array.isArray(existingChat.messages) && existingChat.messages.length > 0) {
        const formatted: BasketMessage[] = [];
        for (const m of existingChat.messages) {
            if (m.role === "user") {
                const text = String(m.content || "").trim();
                if (text) formatted.push({ role: "user", content: text.slice(0, 2000) });
            } else if (m.role === "assistant") {
                const enriched = formatAssistantTurnContext(m.content, m.craftedMail, m.toolEvents);
                if (enriched) formatted.push({ role: "assistant", content: enriched });
            }
        }
        return formatted.slice(-10);
    }

    const history: BasketMessage[] = [];
    const prompts = existingChat.userPrompts || [];
    const responses = existingChat.responses || [];
    const totalTurns = Math.max(prompts.length, responses.length);
    const startIdx = Math.max(0, totalTurns - 5);
    for (let i = startIdx; i < totalTurns; i++) {
        if (prompts[i]?.prompt) {
            history.push({ role: "user", content: String(prompts[i].prompt).slice(0, 2000) });
        }
        const resp = responses[i];
        if (resp) {
            const enriched = formatAssistantTurnContext(resp.response || "", resp.craftedMail, resp.toolEvents);
            if (enriched) {
                history.push({ role: "assistant", content: enriched });
            }
        }
    }
    return history.slice(-10);
}

function buildLegacyMessagesArray(existingChat: any, fallbackNow: string): any[] {
    const legacyMsgs: any[] = [];
    const pArr = existingChat?.userPrompts || [];
    const rArr = existingChat?.responses || [];
    const maxLen = Math.max(pArr.length, rArr.length);
    for (let i = 0; i < maxLen; i++) {
        if (pArr[i]?.prompt) {
            legacyMsgs.push({
                role: "user",
                content: String(pArr[i].prompt),
                created_at: existingChat?.created_at || fallbackNow,
            });
        }
        if (rArr[i]?.response || rArr[i]?.craftedMail) {
            legacyMsgs.push({
                role: "assistant",
                content: String(rArr[i].response || ""),
                ...(rArr[i].craftedMail ? { craftedMail: rArr[i].craftedMail } : {}),
                ...(rArr[i].thought && rArr[i].thought !== "<no_thoughts>" ? { thought: rArr[i].thought } : {}),
                created_at: existingChat?.created_at || fallbackNow,
            });
        }
    }
    return legacyMsgs;
}

async function persistConversationTurn(params: {
    existingChat: any;
    chatId?: string | null;
    turnId?: string;
    userEmail: string;
    activeMailbox: string;
    prompt: string;
    userMsgEntry: any;
    assistantMsgEntry: any;
    generatedTitle: string;
    isUntitled: boolean;
    socket: ChatMessageSender;
}): Promise<{ savedChatId: string | undefined; finalTitle: string }> {
    const {
        chatId,
        turnId,
        userEmail,
        activeMailbox,
        prompt,
        userMsgEntry,
        assistantMsgEntry,
        generatedTitle,
        isUntitled,
        socket,
    } = params;
    let existingChat = params.existingChat;
    const nowFormatted = formatDateTime();

    const pushTurnToExistingChat = async (doc: any) => {
        if (
            turnId &&
            Array.isArray(doc.messages) &&
            doc.messages.some((m: any) => m?.turnId && m.turnId === turnId)
        ) {
            return {
                savedChatId: doc._id.toString(),
                finalTitle: doc.title || generatedTitle || "New Chat",
            };
        }

        const updateDoc: any = {
            $inc: { messageCount: 1 },
            $set: {
                updated_at: nowFormatted,
                lastMessageAt: new Date(),
                mailboxEmail: activeMailbox,
                ...(!doc.email ? { email: userEmail } : {}),
            },
        };

        const hasLegacyOnly =
            (!Array.isArray(doc.messages) || doc.messages.length === 0) &&
            ((doc.userPrompts?.length || 0) > 0 || (doc.responses?.length || 0) > 0);

        if (hasLegacyOnly) {
            const legacyMsgs = buildLegacyMessagesArray(doc, nowFormatted);
            updateDoc.$set.messages = [...legacyMsgs, userMsgEntry, assistantMsgEntry];
        } else {
            updateDoc.$push = {
                messages: { $each: [userMsgEntry, assistantMsgEntry] },
            };
        }

        let resolvedTitle = doc.title || "New Chat";
        if (generatedTitle && isUntitled) {
            updateDoc.$set.title = generatedTitle;
            resolvedTitle = generatedTitle;
        }

        const guardFilter: any = { _id: doc._id };
        if (turnId) {
            guardFilter["messages.turnId"] = { $ne: turnId };
        }

        const updated = await Chats.findOneAndUpdate(guardFilter, updateDoc, { new: true });
        if (!updated) {
            const current: any = await Chats.findById(doc._id).select("title").lean();
            return {
                savedChatId: doc._id.toString(),
                finalTitle: current?.title || resolvedTitle,
            };
        }

        return {
            savedChatId: updated._id.toString(),
            finalTitle: updated.title || resolvedTitle,
        };
    };

    if (!existingChat && chatId) {
        existingChat = await resolveAuthorizedChat(chatId, userEmail);
    }

    let result: { savedChatId: string | undefined; finalTitle: string };
    if (existingChat) {
        result = await pushTurnToExistingChat(existingChat);
    } else {
        const candidateId =
            chatId && mongoose.Types.ObjectId.isValid(chatId)
                ? new mongoose.Types.ObjectId(chatId)
                : new mongoose.Types.ObjectId();

        // Check collision before creating so same-user concurrent races merge instead of minting duplicate ObjectIds
        const existingCollision = await Chats.findById(candidateId).select("_id").lean();
        if (existingCollision) {
            const authorizedExisting = await resolveAuthorizedChat(candidateId.toString(), userEmail);
            if (!authorizedExisting) {
                throw new Error("Unauthorized chat session ID");
            }
            result = await pushTurnToExistingChat(authorizedExisting);
        } else {
            try {
                const fallbackTitle = generatedTitle || prompt.slice(0, 42).trim() || "New Chat";
                const newChat = await Chats.create({
                    _id: candidateId,
                    session_id: candidateId.toString(),
                    title: fallbackTitle,
                    application: "plum",
                    email: userEmail,
                    mailboxEmail: activeMailbox,
                    messages: [userMsgEntry, assistantMsgEntry],
                    messageCount: 1,
                    lastMessageAt: new Date(),
                    created_at: nowFormatted,
                    updated_at: nowFormatted,
                });
                result = {
                    savedChatId: newChat._id.toString(),
                    finalTitle: newChat.title,
                };
            } catch (createErr: any) {
                if (createErr?.code === 11000) {
                    const raced = await resolveAuthorizedChat(candidateId.toString(), userEmail);
                    if (raced) {
                        result = await pushTurnToExistingChat(raced);
                    } else {
                        throw createErr;
                    }
                } else {
                    throw createErr;
                }
            }
        }
    }

    if (socket && result.savedChatId) {
        (socket as any).activeChatId = result.savedChatId;
    }
    return result;
}

export async function handleChatPrompt(options: ChatProcessOptions): Promise<void> {
    const { prompt, chatCount, user, chatId, turnId, socket, abortSignal } = options;
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

        // 2. Load existing chat history & check turn idempotency
        let existingChat: any = null;
        if (chatId) {
            existingChat = await resolveAuthorizedChat(chatId, userEmail);
        }

        if (turnId && Array.isArray(existingChat?.messages)) {
            const dupAsst = existingChat.messages.find(
                (m: any) => m?.role === "assistant" && m?.turnId === turnId
            );
            if (dupAsst) {
                if (dupAsst.craftedMail) {
                    safeSend({
                        type: "SYSTEM",
                        subtype: "EMAIL",
                        message: "Draft loaded",
                        email: dupAsst.craftedMail,
                        done: true,
                        success: true,
                    });
                }
                if (Array.isArray(dupAsst.toolEvents)) {
                    for (const ev of dupAsst.toolEvents) {
                        safeSend({
                            type: "SYSTEM",
                            subtype: "TOOL_RESULT",
                            tool: ev.tool,
                            label: ev.label,
                            summary: ev.summary,
                            success: Boolean(ev.success),
                        });
                    }
                }
                if (dupAsst.content) {
                    safeSend({
                        type: "RESPONSE",
                        response: dupAsst.content,
                        model: "basket",
                        done: false,
                    });
                }
                safeSend({
                    type: "RESPONSE_COMPLETE",
                    chatId: existingChat._id.toString(),
                    title: existingChat.title || "New Chat",
                    done: true,
                    success: true,
                    deduplicated: true,
                });
                return;
            }
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
        let fullAssistantResponse = "";

        const isUntitled =
            !existingChat ||
            !existingChat.title ||
            existingChat.title === "New Chat" ||
            existingChat.title === "New Conversation" ||
            existingChat.title === "Untitled Conversation";

        const buildTurnEntries = () => {
            const nowFormatted = formatDateTime();
            const userMsgEntry: any = {
                role: "user" as const,
                content: prompt,
                created_at: nowFormatted,
                ...(turnId ? { turnId } : {}),
            };
            const assistantMsgEntry: any = {
                role: "assistant" as const,
                content: fullAssistantResponse,
                created_at: formatDateTime(),
                ...(turnId ? { turnId } : {}),
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
            return { userMsgEntry, assistantMsgEntry };
        };

        try {
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
                tokenExpired: Boolean(execResult.tokenExpired),
                mailboxEmail: execResult.mailboxEmail || activeMailbox,
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
            if (fullAssistantResponse.trim() || lastCraftedMail || toolEvents.length > 0) {
                const { userMsgEntry, assistantMsgEntry } = buildTurnEntries();
                await persistConversationTurn({
                    existingChat,
                    chatId,
                    turnId,
                    userEmail,
                    activeMailbox,
                    prompt,
                    userMsgEntry,
                    assistantMsgEntry,
                    generatedTitle: isUntitled ? prompt.slice(0, 42).trim() || "New Chat" : "",
                    isUntitled,
                    socket,
                });
            }
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
            if (fullAssistantResponse.trim() || lastCraftedMail || toolEvents.length > 0) {
                const { userMsgEntry, assistantMsgEntry } = buildTurnEntries();
                await persistConversationTurn({
                    existingChat,
                    chatId,
                    turnId,
                    userEmail,
                    activeMailbox,
                    prompt,
                    userMsgEntry,
                    assistantMsgEntry,
                    generatedTitle: isUntitled ? prompt.slice(0, 42).trim() || "New Chat" : "",
                    isUntitled,
                    socket,
                });
            }
            return;
        }
        } catch (runErr: any) {
            if (abortSignal?.aborted || runErr?.name === "CanceledError" || runErr?.code === "ERR_CANCELED") {
                if (fullAssistantResponse.trim() || lastCraftedMail || toolEvents.length > 0) {
                    try {
                        const { userMsgEntry, assistantMsgEntry } = buildTurnEntries();
                        await persistConversationTurn({
                            existingChat,
                            chatId,
                            turnId,
                            userEmail,
                            activeMailbox,
                            prompt,
                            userMsgEntry,
                            assistantMsgEntry,
                            generatedTitle: isUntitled ? prompt.slice(0, 42).trim() || "New Chat" : "",
                            isUntitled,
                            socket,
                        });
                    } catch (partialErr: any) {
                        logger.warn(`[ChatService] Failed partial persist on abort: ${partialErr.message}`);
                    }
                }
                logger.info(`[ChatService] Request aborted for user=${userEmail}`);
                return;
            }
            throw runErr;
        }

        // 5. Title Generation for New/Untitled Chat
        let generatedTitle = "";
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
            } catch (titleErr: any) {
                logger.warn(`[ChatService] Title generation fallback: ${titleErr.message}`);
                generatedTitle = prompt.slice(0, 42).trim() || "New Chat";
            }

            if (generatedTitle) {
                safeSend({
                    type: "SYSTEM",
                    subtype: "TITLE",
                    chatId: existingChat ? existingChat._id.toString() : chatId || undefined,
                    message: "Chat Title Generated",
                    title: { title: generatedTitle },
                    done: true,
                    success: true,
                });
            }
        }

        // 6. Persist conversation turn atomically into Chats.messages
        let savedChatId = existingChat ? existingChat._id.toString() : chatId || undefined;
        let finalTitle = generatedTitle || existingChat?.title || "New Chat";

        try {
            const { userMsgEntry, assistantMsgEntry } = buildTurnEntries();
            const persisted = await persistConversationTurn({
                existingChat,
                chatId,
                turnId,
                userEmail,
                activeMailbox,
                prompt,
                userMsgEntry,
                assistantMsgEntry,
                generatedTitle,
                isUntitled,
                socket,
            });
            savedChatId = persisted.savedChatId;
            finalTitle = persisted.finalTitle;
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
