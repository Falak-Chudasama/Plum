import axios from "axios";
import fs from "fs";
import https from "https";
import { InboundEmailType, CategoryType } from "../types/types";
import { handleErrorUtil } from "../utils/errors.utils";
import constants from "../constants/constants";
import logger from "../utils/logger.utils";

const filePath = '/src/apis/ms.apis.ts';

const CA_PATH = process.env.CA_PATH || '';

let httpsAgent: https.Agent;
let usingInsecureFallback = false;

try {
    if (!CA_PATH) throw new Error('CA_PATH not set');

    const ca = fs.readFileSync(CA_PATH);
    httpsAgent = new https.Agent({ ca });
    logger.info(`[ms.apis] Loaded CA from: ${CA_PATH}`);
} catch (err: any) {
    logger.warn(`[ms.apis] Could not load CA at CA_PATH="${CA_PATH}": ${err?.message || err}. Falling back to insecure agent (rejectUnauthorized=false).`);
    httpsAgent = new https.Agent({ rejectUnauthorized: false });
    usingInsecureFallback = true;
}

const msAxios = axios.create({
    httpsAgent,
    timeout: 2 * 60 * 1000,
});

const catogEmbed = async (categories: string[]): Promise<InboundEmailType[] | null> => {
    try {
        logger.info('Categorize Embed API called');
        const result = await msAxios.post(`${constants.msOrigin}/embed/categorization`, { content: categories });

        if (!result.data || !result.data.success) throw Error('Failed to embed categories');

        return result.data;
    } catch (err) {
        handleErrorUtil(filePath, 'catogEmbed', err, 'Calling MS API to embed the categories');
    }
    return null;
};

const catogSearch = async (query: string, k: number = 3): Promise<Object> => {
    try {
        logger.info('Categorize Search API Called')
        const response = await msAxios.post(`${constants.msOrigin}/search/categorization`, { query, k });

        if (!response || !response.data.success) throw Error('Failed to search categories');

        return response.data.results;
    } catch (err) {
        handleErrorUtil(filePath, 'catogSearch', err, 'Calling MS API to search categories');
        return null;
    }
};

const catogDelAll = async (): Promise<boolean> => {
    try {
        logger.info('Categorizies Delete All API Called')
        const response = await msAxios.delete(`${constants.msOrigin}/delete-all/categorization`);
        if (!response || !response.data.success) throw Error('Failed to delete categories');

        return true;
    } catch (err) {
        handleErrorUtil(filePath, 'catogDelAll', err, 'Calling MS API to delete all categories');
        return false;
    }
};

const chatEmbed = async (chat: string | string[]): Promise<InboundEmailType[] | null> => {
    try {
        logger.info('Chat Embed API called');
        const result = await msAxios.post(`${constants.msOrigin}/embed/chat`, { content: chat });

        if (!result.data || !result.data.success) throw Error('Failed to embed chat');

        return result.data;
    } catch (err) {
        handleErrorUtil(filePath, 'chatEmbed', err, 'Calling MS API to embed the chat');
    }
    return null;
};

const chatSearch = async (query: string, k: number): Promise<Object | []> => {
    try {
        logger.info('Chat Search API Called')
        const response = await msAxios.post(`${constants.msOrigin}/search/chat`, { query, k });

        if (!response || !response.data.success) throw Error('Failed to search chats');

        return response;
    } catch (err) {
        handleErrorUtil(filePath, 'chatSearch', err, 'Calling MS API to search chats');
        return []
    }
};

const msAPIs = {
    catogEmbed,
    catogSearch,
    catogDelAll,
    chatEmbed,
    chatSearch
};

export default msAPIs;
