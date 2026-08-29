import { handleErrorUtil } from "../utils/errors.utils";
import { GenerateArgs, UserObjType } from "../types/types";
import constants from "../constants/constants";
import TaskQueue from "../core/TaskQueue";
import logger from "../utils/logger.utils";
import utils from "../utils/utils";
import globals from "../globals/globals";

const filePath = "/adapters/groq.adapters.ts";
const groqQueue = new TaskQueue();

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const groqGenerateUtil = async ({
    socket,
    model,
    prompt,
    system,
    stream = true,
    intent = 'general',
    temperature = 0.6,   // GPT-OSS requires 0.5–0.7, never 0
}: GenerateArgs) => {
    try {
        const controller = new AbortController();

        if (socket) {
            socket.on('message', (data: string) => {
                try {
                    const res = JSON.parse(data);
                    if ((res.type === 'COMMAND' && res.command === 'STOP_RESPONSE') || res.message === 'STOP_RESPONSE') {
                        logger.info('Response was Aborted');
                        controller.abort();
                    }
                } catch (err) {
                    logger.error("Error handling message:", err);
                }
            });
        }

        logger.info("Groq API Called");

        const userObj = globals.userObj as UserObjType;

        // GPT-OSS docs: avoid system prompts — merge everything into the user message
        let userMessage = '';

        if (intent === 'general') {
            userMessage += `${constants.primarySysPrompt}\n${system}\n\n`;

            if (userObj?.email) {
                userMessage += `User Info: firstName=${userObj.firstName}, lastName=${userObj.lastName}, email=${userObj.email}\n`;
                userMessage += `Current IST datetime: ${utils.getISTDateTime().humanDate}, ${utils.getISTDateTime().time}\n\n`;
            }

            userMessage += `User message: ${prompt}`;
        } else {
            // For non-general intents (titling, craft_mail, generate_mongo_query)
            // system already contains all instructions; just append prompt
            userMessage = `${system}\n\n${prompt}`;
        }

        const requestBody: any = {
            model,
            messages: [
                { role: "user", content: userMessage }
            ],
            temperature: Math.max(temperature, 0.5),  // enforce minimum for GPT-OSS
            top_p: 0.95,
            max_completion_tokens: intent === 'general' ? 1024 : 2048,
            stream,
            reasoning_effort: 'low',       // GPT-OSS: low | medium | high
            include_reasoning: false,       // don't return reasoning tokens, just the answer
        };

        logger.info(`Calling Groq model: ${model}`);

        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.GROQ_KEY}`
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

        if (!response.ok) {
            const errBody = await response.text();
            logger.error(`Groq error ${response.status}: ${errBody}`);
            logger.error(`Key prefix: ${process.env.GROQ_KEY?.slice(0, 12) ?? 'UNDEFINED'}`);
            socket?.send(JSON.stringify({ type: "ERROR", message: "Groq API error" }));
            throw new Error(`Groq response failed: ${response.status} — ${errBody}`);
        }

        if (intent === "general") {
            globals.mostRecentPrompt = prompt;
            globals.mostRecentResponse = '';
        } else if (intent === "craft_mail") {
            socket?.send(JSON.stringify({
                type: 'SYSTEM',
                subtype: 'EMAIL',
                message: 'Crafting Email',
                done: false
            }));
            globals.mostRecentCraftedMail = '';
        }

        // ── Non-streaming ──────────────────────────────────────────────
        if (!stream) {
            logger.info("Successfully got Groq non-stream response");
            const res = await response.json();
            return res;
        }

        if (!response.body) {
            throw new Error('Response body is null');
        }

        // ── Streaming ──────────────────────────────────────────────────
        logger.info("Streaming Groq Response in Chunks...");

        const decoder = new TextDecoder("utf-8");
        const reader = response.body.getReader();
        let finished = false;

        const sendChunk = (chunk: string) => {
            const lines = chunk
                .split('\n')
                .map(l => l.trim())
                .filter(l => l.startsWith('data: '));

            for (const line of lines) {
                const raw = line.slice(6).trim();
                if (raw === '[DONE]') { finished = true; return; }

                try {
                    const parsed = JSON.parse(raw);
                    const choice = parsed.choices?.[0];
                    if (!choice) continue;

                    if (choice.finish_reason !== null && choice.finish_reason !== undefined) {
                        finished = true;
                        return;
                    }

                    const textChunk: string = choice.delta?.content ?? '';
                    if (!textChunk) continue;

                    if (intent === "general") {
                        globals.mostRecentResponse += textChunk;
                    }

                    socket?.send(JSON.stringify({
                        type: "RESPONSE",
                        model,
                        messege: textChunk,
                        response: textChunk,
                        success: true,
                        done: false
                    }));
                } catch (err) {
                    logger.warn("Failed to parse stream chunk:", err);
                }
            }
        };

        console.log('PLUM_RESPONSE');
        while (!finished) {
            const { done, value } = await reader.read();
            if (done) break;
            sendChunk(decoder.decode(value, { stream: true }));
        }
        console.log();

        logger.info("Successfully got Groq streaming response");

    } catch (err) {
        const errName = (err as any)?.name as string ?? '';
        if (errName.startsWith('AbortError')) {
            socket?.send(JSON.stringify({
                type: 'INFO',
                message: 'Response was Aborted',
                success: false,
                done: true,
            }));
        } else {
            handleErrorUtil(filePath, "groqGenerateUtil", err, "Calling Groq to generate response");
        }
    }
};

const groqGenerate = async (args: GenerateArgs): Promise<any> => {
    try {
        const result = await groqQueue.add(groqGenerateUtil, args);
        return result;
    } catch (err) {
        handleErrorUtil(filePath, "groqGenerate", err, "Calling Groq to generate response");
        return null;
    }
};

export default groqGenerate;