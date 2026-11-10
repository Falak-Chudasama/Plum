import axios, { AxiosInstance } from "axios";
import http from "http";
import crypto from "crypto";
import logger from "../utils/logger.utils";

export interface BasketMessage {
    role: "system" | "user" | "assistant" | "tool";
    content: string;
}

export interface BasketChatOptions {
    messages: BasketMessage[];
    system_prompt?: string;
    grammar?: string;
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    model?: string;
    stream?: boolean;
    abstracted?: boolean;
    requestId?: string;
    timeoutMs?: number;
}

export interface BasketStreamCallbacks {
    onToken: (token: string) => void;
    onComplete?: (fullText: string) => void;
    onError?: (err: Error) => void;
}

export class BasketError extends Error {
    public readonly statusCode?: number;
    public readonly requestId?: string;
    public readonly isBasketError = true;

    constructor(message: string, statusCode?: number, requestId?: string) {
        super(message);
        this.name = "BasketError";
        this.statusCode = statusCode;
        this.requestId = requestId;
        Object.setPrototypeOf(this, BasketError.prototype);
    }
}

class BasketClient {
    private client: AxiosInstance;
    private baseUrl: string;

    constructor() {
        this.baseUrl = process.env.BASKET_URL || "http://api.basket.com/llm/chat";
        const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });

        this.client = axios.create({
            httpAgent,
            timeout: Number(process.env.BASKET_TIMEOUT_MS) || 60000,
        });
    }

    private buildHeaders(requestId: string, stream = false) {
        return {
            "Content-Type": "application/json",
            "Accept": stream ? "text/plain, text/event-stream" : "application/json",
            "X-Basket-Application": "plum",
            "X-Request-ID": requestId,
        };
    }

    private buildPayload(options: BasketChatOptions, stream = false) {
        const payload: Record<string, any> = {
            messages: options.messages,
            stream,
            abstracted: options.abstracted ?? true,
        };

        if (options.system_prompt) {
            payload.system_prompt = options.system_prompt;
        }
        if (options.grammar) {
            payload.grammar = options.grammar;
        }
        if (typeof options.temperature === "number") {
            payload.temperature = options.temperature;
        }
        if (typeof options.top_p === "number") {
            payload.top_p = options.top_p;
        }
        if (options.max_tokens) {
            payload.max_tokens = options.max_tokens;
        }
        if (options.model) {
            payload.model = options.model;
        }

        return payload;
    }

    /**
     * Generate 768-dim embeddings from Basket via Jina Embeddings model
     */
    async createEmbedding(input: string): Promise<number[]>;
    async createEmbedding(input: string[]): Promise<number[][]>;
    async createEmbedding(input: string | string[]): Promise<number[] | number[][]> {
        const requestId = crypto.randomUUID();
        const embeddingUrl = process.env.BASKET_EMBEDDING_URL || "http://api.basket.com/llm/embeddings";
        const headers = this.buildHeaders(requestId, false);

        try {
            const response = await this.client.post(
                embeddingUrl,
                { input },
                {
                    headers,
                    timeout: 15000,
                }
            );

            const data = response.data;
            if (Array.isArray(input)) {
                return data?.data?.map((item: any) => item.embedding) || [];
            }
            return data?.data?.[0]?.embedding || [];
        } catch (err: any) {
            const status = err?.response?.status;
            const detail = err?.response?.data?.detail || err?.message || "Embedding request failed";
            logger.error(`[BasketClient] Embedding error requestId=${requestId} status=${status} detail=${detail}`);
            throw new BasketError(`Basket embedding failed: ${detail}`, status, requestId);
        }
    }

    /**
     * Non-streaming completion from Basket.
     */
    async complete(options: BasketChatOptions): Promise<string> {
        const requestId = options.requestId || crypto.randomUUID();
        const payload = this.buildPayload(options, false);
        const headers = this.buildHeaders(requestId, false);

        logger.info(`[BasketClient] POST ${this.baseUrl} requestId=${requestId} grammar=${Boolean(options.grammar)}`);

        try {
            const response = await this.client.post(this.baseUrl, payload, {
                headers,
                timeout: options.timeoutMs || Number(process.env.BASKET_TIMEOUT_MS) || 60000,
            });

            const data = response.data;
            if (typeof data === "string") {
                return data;
            }
            if (data && typeof data === "object") {
                if (data.choices && Array.isArray(data.choices) && data.choices[0]?.message?.content) {
                    return data.choices[0].message.content;
                }
                if (data.content) {
                    return data.content;
                }
                return JSON.stringify(data);
            }
            return String(data ?? "");
        } catch (err: any) {
            const status = err?.response?.status;
            const detail = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Unknown error";
            logger.error(`[BasketClient] Complete error requestId=${requestId} status=${status} detail=${detail}`);
            throw new BasketError(`Basket inference failed (${status || "unreachable"}): ${detail}`, status, requestId);
        }
    }

    /**
     * Streaming completion from Basket.
     */
    async stream(options: BasketChatOptions, callbacks: BasketStreamCallbacks): Promise<string> {
        const requestId = options.requestId || crypto.randomUUID();
        const payload = this.buildPayload(options, true);
        const headers = this.buildHeaders(requestId, true);

        logger.info(`[BasketClient] STREAM POST ${this.baseUrl} requestId=${requestId}`);

        let fullText = "";

        try {
            const response = await this.client.post(this.baseUrl, payload, {
                headers,
                responseType: "stream",
                timeout: options.timeoutMs || Number(process.env.BASKET_TIMEOUT_MS) || 120000,
            });

            return await new Promise<string>((resolve, reject) => {
                const stream = response.data;

                stream.on("data", (chunk: Buffer) => {
                    const text = chunk.toString("utf-8");
                    if (!text) return;

                    // Basket streaming text may be plain chunks or SSE "data: ..." lines
                    const lines = text.split("\n");
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || trimmed.startsWith(":")) continue;
                        if (trimmed === "data: [DONE]" || trimmed === "[DONE]") {
                            continue;
                        }

                        let token = line;
                        if (trimmed.startsWith("data:")) {
                            const raw = trimmed.slice(5).trim();
                            try {
                                const parsed = JSON.parse(raw);
                                token = parsed.choices?.[0]?.delta?.content ?? parsed.text ?? parsed.content ?? raw;
                            } catch {
                                token = raw;
                            }
                        }

                        if (token) {
                            fullText += token;
                            callbacks.onToken(token);
                        }
                    }
                });

                stream.on("end", () => {
                    callbacks.onComplete?.(fullText);
                    resolve(fullText);
                });

                stream.on("error", (err: any) => {
                    callbacks.onError?.(err);
                    reject(new BasketError(`Basket stream error: ${err.message}`, 500, requestId));
                });
            });
        } catch (err: any) {
            const status = err?.response?.status;
            const detail = err?.response?.data?.detail || err?.message || "Stream request failed";
            logger.error(`[BasketClient] Stream error requestId=${requestId} status=${status} detail=${detail}`);
            const error = new BasketError(`Basket stream failed (${status || "unreachable"}): ${detail}`, status, requestId);
            callbacks.onError?.(error);
            throw error;
        }
    }
}

const basketClient = new BasketClient();
export default basketClient;

