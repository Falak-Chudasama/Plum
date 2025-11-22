import { LMStudioClient } from "@lmstudio/sdk";
import logger from "../utils/logger.utils";
import constants from "../constants/constants";

const client = new LMStudioClient();

const listModels = async () => {
    try {
        logger.info("Fetching list of all available models...");
        const models = await client.system.listDownloadedModels();
        logger.info(`Found ${models.length} models.`);
        return models;
    } catch (err) {
        logger.error(`Failed to list available models: ${err}`);
        throw err;
    }
}

const listLoadedModels = async () => {
    try {
        logger.info("Fetching list of loaded models in memory...");
        const response = await client.llm.listLoaded();
        const loadedModels = response.map(m => m.identifier);
        logger.info(`Currently loaded models: ${loadedModels.join(", ")}`);
        return loadedModels;
    } catch (err) {
        logger.error(`Failed to list loaded models: ${err}`);
        throw err;
    }
}

const loadLMSModel = async (modelId: string, identifier?: string) => {
    try {
        const loaded = await client.llm.listLoaded();
        const already = loaded.find(m => m.modelKey === modelId || m.identifier === identifier);
        if (already) {
            logger.info(`Model ${modelId} is already loaded as identifier "${already.identifier}". Skipping load.`);
            return already;
        }

        logger.info(`Loading model ${modelId}...`);
        const model = await client.llm.load(modelId, {
            identifier: identifier || modelId,
            config: {
                contextLength: constants.defaultContextLength,
                gpu: { ratio: 0.8 }
            }
        });
        logger.info(`Model ${modelId} loaded successfully.`);
        return model;
    } catch (err) {
        logger.error(`Failed to load model ${modelId}: ${err}`);
        throw err;
    }
};

const unloadLMSModel = async (identifier: string) => {
    try {
        if (identifier === '*') {
            logger.info(`Unloading all models...`);
            const models = await listLoadedModels();
            await Promise.all(models.map(async (model) => await client.llm.unload(model)));
            logger.info(`All(${models.join(', ')}) models unloaded`);
        } else {
            logger.info(`Unloading model ${identifier}...`);
            await client.llm.unload(identifier);
            logger.info(`Model ${identifier} unloaded.`);
        }

    } catch (err) {
        logger.error(`Failed to unload model ${identifier}: ${err}`);
    }
};

const lmsModelOps = {
    loadLMSModel,
    unloadLMSModel,
    listModels,
    listLoadedModels,
};

export default lmsModelOps;