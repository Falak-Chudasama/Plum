import basketClient from "../basket.client";
import { MONGO_QUERY_GRAMMAR, buildSafeMongoQuery } from "../grammars/mongoQuery.grammar";
import models from "../../models/models";
import { InboundEmailType } from "../../types/types";
import logger from "../../utils/logger.utils";

const DB_FETCHER_SYSTEM_PROMPT = `
You are a MongoDB Query Generator for Plum Inbound Emails.
Translate the user's natural language search request into a JSON filter object.

Allowed JSON fields:
- category: string (e.g. "Deadline")
- categories: array of strings
- senderEmail: string
- senderName: string
- subject: string
- body: string (keywords to search in email body)
- isViewed: boolean
- limit: integer (1-20)

Rules:
1. Return ONLY the JSON object.
2. Only include fields that match the user's request.
3. Do not include account/email filters; tenant isolation is handled by the server.
`.trim();

export interface DbFetchResult {
    query: string;
    result: InboundEmailType[];
    isSuccess: boolean;
    resultCount: number;
}

export async function fetchDbEmails(
    userPrompt: string,
    authenticatedEmail: string
): Promise<DbFetchResult> {
    logger.info(`[DbFetcherService] Translating query for user=${authenticatedEmail}: "${userPrompt}"`);

    try {
        const rawResponse = await basketClient.complete({
            messages: [
                { role: "system", content: DB_FETCHER_SYSTEM_PROMPT },
                { role: "user", content: userPrompt },
            ],
            grammar: MONGO_QUERY_GRAMMAR,
            temperature: 0.0,
            max_tokens: 200,
        });

        const safeQuery = buildSafeMongoQuery(rawResponse, authenticatedEmail);

        logger.info(`[DbFetcherService] Executing safe query: ${JSON.stringify(safeQuery.filter)} limit=${safeQuery.limit}`);

        const results = await models.InboundEmail.find(safeQuery.filter)
            .sort(safeQuery.sort)
            .limit(safeQuery.limit)
            .lean();

        return {
            query: JSON.stringify(safeQuery.filter),
            result: results as InboundEmailType[],
            isSuccess: true,
            resultCount: results.length,
        };
    } catch (err: any) {
        logger.error(`[DbFetcherService] Failed to execute natural language query: ${err.message}`);
        return {
            query: JSON.stringify({ email: authenticatedEmail }),
            result: [],
            isSuccess: false,
            resultCount: 0,
        };
    }
}

