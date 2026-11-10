import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import jwt from "jsonwebtoken";
import logger from "../utils/logger.utils";
import { handleChatPrompt } from "../ai/services/chat.service";
import User from "../models/user.models";

const WEB_SOCKET_PORT1 = Number(process.env.WEB_SOCKET_PORT1) || 4065;
const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || "@Plums1Cause2Type3Two4Diabetes@";

interface AuthenticatedWebSocket extends WebSocket {
    authenticatedEmail?: string;
    userName?: string;
    userLastName?: string;
    activeChatId?: string | null;
}

function parseCookies(cookieHeader?: string): Record<string, string> {
    const list: Record<string, string> = {};
    if (!cookieHeader) return list;

    cookieHeader.split(";").forEach((cookie) => {
        const parts = cookie.split("=");
        const name = parts.shift()?.trim();
        const value = parts.join("=").trim();
        if (name) {
            list[name] = decodeURIComponent(value);
        }
    });

    return list;
}

function extractEmailFromUpgradeReq(req: http.IncomingMessage): string | null {
    try {
        const cookies = parseCookies(req.headers.cookie);
        const token = cookies.accessToken;
        if (token) {
            const decoded = jwt.verify(token, accessTokenSecret) as { email: string };
            if (decoded?.email) return decoded.email;
        }

        const refreshToken = cookies.refreshToken;
        if (refreshToken) {
            const refreshSecret = process.env.REFRESH_TOKEN_SECRET || "@Thanos6Loves5Plums4Because3They2Are1Purple@";
            const decoded = jwt.verify(refreshToken, refreshSecret) as { email: string };
            if (decoded?.email) return decoded.email;
        }

        if (cookies.gmail) {
            return cookies.gmail;
        }
    } catch {
        // token verification failed or expired
    }
    return null;
}

const clientWss = new WebSocketServer({ port: WEB_SOCKET_PORT1 });

clientWss.on("listening", () => {
    logger.info(`[ClientWss] Plum Server WebSocket listening at -> port ${WEB_SOCKET_PORT1}`);
});

clientWss.on("connection", async (socket: AuthenticatedWebSocket, req: http.IncomingMessage) => {
    logger.info("[ClientWss] New client connection established");

    // Extract authentication from connection upgrade
    const emailFromReq = extractEmailFromUpgradeReq(req);
    if (emailFromReq) {
        socket.authenticatedEmail = emailFromReq;
        try {
            const userRecord = await User.findOne({ email: emailFromReq }).lean();
            if (userRecord) {
                socket.userName = userRecord.name || undefined;
                socket.userLastName = userRecord.lastName || undefined;
            }
        } catch (err: any) {
            logger.warn(`[ClientWss] Error fetching user record: ${err.message}`);
        }
    }

    socket.on("close", (code, reason) => {
        logger.info(`[ClientWss] Connection closed (${code}) for user=${socket.authenticatedEmail || "unknown"}: ${reason?.toString()}`);
    });

    socket.on("error", (err) => {
        logger.error(`[ClientWss] Socket error for user=${socket.authenticatedEmail || "unknown"}: ${err.message}`);
    });

    socket.on("message", async (rawMessage: Buffer | string) => {
        try {
            const dataStr = rawMessage.toString();
            const message = JSON.parse(dataStr);

            if (message.type === "COMMAND") {
                const command = String(message.command || "");

                if (command.startsWith("NEW_CHAT_CLICKED:")) {
                    const chatId = command.split(":")[1];
                    socket.activeChatId = chatId;
                    logger.info(`[ClientWss] User switched active chat to id=${chatId}`);
                } else if (command === "CLEAR_CONTEXT" || command === "NEW_CHAT") {
                    socket.activeChatId = null;
                    logger.info(`[ClientWss] User cleared active chat context`);
                } else if (command === "STOP_RESPONSE") {
                    logger.info(`[ClientWss] User requested STOP_RESPONSE`);
                }
                return;
            }

            if (message.type === "PROMPT") {
                const prompt = message.prompt || message.message || "";
                if (!prompt.trim()) return;

                // Resolve user email with fallback hierarchy:
                // 1. Authenticated socket session from cookie JWT
                // 2. Email payload in message (if socket not authenticated yet)
                const effectiveEmail = socket.authenticatedEmail || message.email;
                if (!effectiveEmail) {
                    socket.send(JSON.stringify({
                        type: "ERROR",
                        error: "Unauthorized: Missing user authentication on chat socket.",
                        done: true,
                        success: false,
                    }));
                    return;
                }

                // If user details not loaded yet, fetch from DB
                if (!socket.userName || !socket.authenticatedEmail) {
                    socket.authenticatedEmail = effectiveEmail;
                    try {
                        const userRecord = await User.findOne({ email: effectiveEmail }).lean();
                        if (userRecord) {
                            socket.userName = userRecord.name || undefined;
                            socket.userLastName = userRecord.lastName || undefined;
                        }
                    } catch {
                        // ignore
                    }
                }

                const chatCount = typeof message.chatCount === "number" ? message.chatCount : 0;
                const chatId = message.chatId || socket.activeChatId;

                await handleChatPrompt({
                    prompt,
                    chatCount,
                    user: {
                        email: effectiveEmail,
                        name: socket.userName,
                        lastName: socket.userLastName,
                    },
                    chatId,
                    socket,
                });
            }
        } catch (err: any) {
            logger.error(`[ClientWss] Error processing client message: ${err.message}`);
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: "ERROR",
                    error: "Failed to process chat message",
                    done: true,
                    success: false,
                }));
            }
        }
    });
});

export default clientWss;
