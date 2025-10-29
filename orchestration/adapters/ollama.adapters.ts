import { handleErrorUtil } from "../utils/errors.utils";
import { GenerateArgs } from "../types/types";
import constants from "../constants/constants";
import TaskQueue from "../core/TaskQueue";
import logger from "../utils/logger.utils";

const filePath = '/adapters/ollama.adapters.ts';

const ollamaQueue = new TaskQueue();

const delay = 2 * 60; // two hours

const parseResponse = (response: string): string[] => {
    return response
        .split('</think>')
        .map(chunk => chunk.replace('<think>', '').trim())
        .filter(chunk => chunk !== '').reverse();
};

const ollamaGenerateUtil = async ({ socket, model, prompt, system, temperature = 1, stream = false }: GenerateArgs) => {
    try {
        logger.info('Ollama API Called');
        const systemPrompt = `${constants.primarySysPrompt} \n${system}`;
        const object = { model, prompt, system: systemPrompt, temperature, stream }
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(object)
        });

        if (!response) {
            throw Error('Error getting response from ollama');
        }

        if (!response.ok || !response.body) {
            socket!.send(JSON.stringify({ type: 'ERROR', message: "Ollama stream failed" }));
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            try {
                const obj = JSON.parse(chunk);
                const socketChunk = {
                    type: 'RESPONSE',
                    message: obj.response,
                    model: obj.model,
                    done: false
                }
                console.log(socketChunk);
                socket!.send(JSON.stringify(socketChunk));
            } catch (err) {
                console.log(chunk);
                socket!.send(chunk);
            }
        }

        socket!.send(JSON.stringify({ type: 'RESPONSE', message: '\nResponse Ended' , done: true }));
        logger.info('Successfully got Ollama Response');
    } catch (err) {
        handleErrorUtil(filePath, 'ollamaGenerateUtil', err, 'Calling Ollama to generate response (Utility)');
    }
};

const ollamaGenerate = async ({ socket, model, prompt, system, temperature = 1, stream = false }: GenerateArgs): Promise<string | null> => {
    try {
        const result = await ollamaQueue.add(ollamaGenerateUtil, { socket, model, prompt, system, temperature, stream });
        return result;
    } catch (err) {
        handleErrorUtil(filePath, 'ollamaGenerateUtil', err, 'Calling Ollama to generate response (Utility)');
        return null;
    }
};

export default ollamaGenerate;