import axios from "axios";
import { handleErrorUtil } from "../utils/errors.utils";
import { GenerateArgs } from "../types/types";
import constants from "../constants/constants";
import TaskQueue from "../core/TaskQueue";

const filePath = '/adapters/ollama.adapters.ts';

const ollamaQueue = new TaskQueue();

const parseResponse = (response: string): string[] => {
    return response
        .split('</think>')
        .map(chunk => chunk.replace('<think>', '').trim())
        .filter(chunk => chunk !== '').reverse();
};

const ollamaGenerateUtil = async ({ model, prompt, system, temperature = 1, stream = false }: GenerateArgs) => {
    try {
        const { data } = await axios.post(
            'http://localhost:11434/api/generate',
            { model, prompt, system: `${constants.primarySysPrompt} :: ${system}`, temperature, stream }
        );

        if (!data || !data.response) {
            throw new Error('Ollama returned an invalid response.');
        }

        const parsed = parseResponse(data.response);

        return parsed.length === 1 ? parsed[0] : parsed;
    } catch (err) {
        handleErrorUtil(filePath, 'ollamaGenerateUtil', err, 'Calling Ollama to generate response (Utility)');
    }
};

const ollamaGenerate = async ({ model, prompt, system, temperature = 1, stream = false }: GenerateArgs): Promise<string | null> => {
    try {
        const result = await ollamaQueue.add(ollamaGenerateUtil, { model, prompt, system, temperature, stream });
        return result;
    } catch (err) {
        handleErrorUtil(filePath, 'ollamaGenerateUtil', err, 'Calling Ollama to generate response (Utility)');
        return null;
    }
};

export default ollamaGenerate;