import axios from "axios";
import handleError from "../utils/errors.utils";
import { GenerateArgs } from "../types/types";
import constants from "../constants/constants";
import TaskQueue from "../core/TaskQueue";

const ollamaQueue = new TaskQueue();

const parseResponse = (response: string): string[] => {
    return response
        .split('</think>')
        .map(chunk => chunk.replace('<think>', '').trim())
        .filter(chunk => chunk !== '').reverse();
};

const ollamaGenerateUtil = async ({ model, prompt, system, temperature = 1, stream = false }: GenerateArgs) => {
    try {
        console.log('[Ollama] Sending prompt...');

        const { data } = await axios.post(
            'http://localhost:11434/api/generate',
            { model, prompt, system: `${constants.primarySysPrompt} :: ${system}`, temperature, stream }
        );

        if (!data || !data.response) {
            throw new Error('Ollama returned an invalid response.');
        }

        const parsed = parseResponse(data.response);

        console.log('[Ollama] Received response');

        console.log(parsed[0]);

        return parsed.length === 1 ? parsed[0] : parsed;
    } catch (err) {
        console.error('[Ollama] Failed to generate response');
        handleError(err);
    }
};

const ollamaGenerate = async ({ model, prompt, system, temperature = 1, stream = false }: GenerateArgs): Promise<string | null> => {
    try {
        const result = await ollamaQueue.add(ollamaGenerateUtil, { model, prompt, system, temperature, stream });
        return result;
    } catch (err) {
        handleError(err);
        return null;
    }
};

export default ollamaGenerate;