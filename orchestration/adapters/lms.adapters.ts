import { handleErrorUtil } from "../utils/errors.utils";
import { GenerateArgs } from "../types/types";
import constants from "../constants/constants";
import TaskQueue from "../core/TaskQueue";
import logger from "../utils/logger.utils";
import utils from "../utils/utils";
import lmsModelOps from "./lms.models";

const filePath = "/adapters/lms.adapters.ts";
const lmsQueue = new TaskQueue();

const lmsGenerateUtil = async ({
    socket,
    model,
    prompt,
    system,
    temperature = 0,
    stream = true
}: GenerateArgs) => {
    try {
        const listedModel = await lmsModelOps.listLoadedModels();

        if (listedModel[0] !== model) {
            socket?.send(JSON.stringify({
                type: 'INFO',
                message: `loading the model: ${model}`,
                loading: true,
                done: false
            }));

            await lmsModelOps.unloadLMSModel('*');
            await lmsModelOps.loadLMSModel(model);

            socket?.send(JSON.stringify({
                type: 'INFO',
                message: `loaded the model: ${model}`,
                loading: false,
                done: true
            }));
        }

        const controller = new AbortController();
        socket!.on("message", (data: string) => {
            try {
                const res = JSON.parse(data);
                if (res.type === 'COMMAND' && res.command === 'STOP_RESPONSE' || res.message === 'STOP_RESPONSE') {
                    logger.info('Response was Aborted');
                    controller.abort();
                }
            } catch (err) {
                logger.error("Error handling message:", err);
            }
        });

        logger.info("LM Studio API Called");

        const systemPrompt = `${constants.primarySysPrompt}\n${system}`;
        const requestBody: any = {
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            temperature,
            stream
        };

        const response = await fetch("http://localhost:1234/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

        if (!response.ok || !response.body) {
            socket?.send(JSON.stringify({ type: "ERROR", message: "LM Studio stream failed" }));
            throw new Error(`LM Studio response failed: ${response.status}`);
        }

        logger.info("Streaming LMS Response in Chunks...");

        if (!stream) {
            const res = response.json();
            return res;
        }

        const decoder = new TextDecoder("utf-8");
        const reader = response.body.getReader();
        let finished = false;
        let thinking = false;

        const sendChunk = (chunk: string) => {
            const data = chunk.split('data: ').filter((data) => !(new Set(['', '\n', '[DONE]']).has(data.trim())));
            try {
                const parsedChunks = data.map((d) => JSON.parse(d).choices[0] ?? {})

                for (let parsedChunk of parsedChunks) {
                    if (parsedChunk.finish_reason !== null) {
                        finished = true;
                        return;
                    }
                    const textChunk = parsedChunk.delta.content ?? '';
                    if (utils.isCleanResponse(textChunk)) {
                        if (textChunk === '<think>') {
                            thinking = true;
                            return;
                        } else if (textChunk === '</think>') {
                            thinking = false;
                            return;
                        }
                        const chunkObj = (thinking ? {
                            type: "THOUGHT",
                            model,
                            messege: textChunk,
                            thought: textChunk,
                            success: true,
                            done: false
                        } : {
                            type: "RESPONSE",
                            model,
                            messege: textChunk,
                            response: textChunk,
                            success: true,
                            done: false
                        });
                        console.log(chunkObj);
                        socket?.send(
                            JSON.stringify(chunkObj)
                        );
                    }
                }
            } catch (err) {
                logger.warn("Failed to parse stream chunk:", err);
            }
        }

        console.log('PLUM_RESPONSE');
        while (!finished) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            sendChunk(chunk);
        }
        console.log();

        socket?.send(JSON.stringify({ type: "RESPONSE", message: "\n<RESPONSE_ENDED>", success: true, done: true }));
        logger.info("Successfully got LM Studio streaming response");
    } catch (err) {
        handleErrorUtil(filePath, "lmsGenerateUtil", err, "Calling LM Studio to generate response (Utility)");
    }
};

const lmsGenerate = async (args: GenerateArgs): Promise<string | null> => {
    try {
        const result = await lmsQueue.add(lmsGenerateUtil, args);
        return result;
    } catch (err) {
        handleErrorUtil(filePath, "lmsGenerate", err, "Calling LM Studio to generate response (Utility)");
        return null;
    }
};

export default lmsGenerate;