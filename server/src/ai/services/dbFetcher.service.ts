import basketClient from "../basket.client";
import { MONGO_QUERY_GRAMMAR, buildSafeMongoQuery, SafeQuerySpec } from "../grammars/mongoQuery.grammar";
import models from "../../models/models";
import logger from "../../utils/logger.utils";

const DB_FETCHER_SYSTEM_PROMPT = `
You are a versatile, intelligent MongoDB Query Generator for Plum Email Assistant.
Translate the user's natural language search request into a JSON filter object that queries the user's email archive.

Plum stores two kinds of correspondence:
1. Inbound Emails (emails received by the user from external senders)
2. Outbound Emails (emails sent by the user, or drafts prepared by the user)

Allowed JSON fields:
- scope: "all" | "inbound" | "outbound" | "sent" | "draft"
- status: "sent" | "draft"
- recipientEmail: string (email address or name of recipient for outbound emails)
- to: string (alias for recipientEmail)
- senderEmail: string (email address of sender for inbound emails)
- senderName: string (name of sender for inbound emails)
- subject: string (keywords to match in subject line)
- body: string (keywords to search within the email message content)
- category: string (e.g. "Urgent", "Academic", "Finance", "Other")
- categories: array of strings
- isViewed: boolean (true for read, false for unread - inbound only)
- limit: integer (1-25)

Decision Guidelines:
1. Identifying Outbound Emails:
   - When the user asks: "Show emails I sent", "sent emails", "what did I send to X", "check my drafts", "outbound messages":
     Set "scope": "outbound" (or "sent" / "draft").
     If they mention who they sent to, set "recipientEmail".
2. Identifying Inbound Emails:
   - When the user asks: "Show emails from X", "received emails", "unread emails", "inbox":
     Set "scope": "inbound".
     Set "senderEmail" or "senderName".
3. General or Topic Searches:
   - When the user asks: "Find emails about meeting", "Search for invoices", "Somaiya deadlines":
     Set "scope": "all" so Plum searches BOTH received and sent correspondence.
4. Output Format:
   - Return ONLY the raw JSON object. Do not enclose in markdown code blocks.
`.trim();

export interface UnifiedEmail {
    id: string;
    direction: "inbound" | "outbound";
    status: "received" | "sent" | "draft";
    senderEmail: string;
    senderName?: string;
    to: string | string[];
    subject: string;
    snippet?: string;
    bodyText?: string;
    categories?: string[];
    createdAt?: Date | string;
}

export interface DbFetchResult {
    query: string;
    result: UnifiedEmail[];
    isSuccess: boolean;
    resultCount: number;
    scope: SafeQuerySpec["scope"];
}

export async function fetchDbEmails(
    userPrompt: string,
    authenticatedEmail: string
): Promise<DbFetchResult> {
    const authEmail = authenticatedEmail.toLowerCase().trim();
    logger.info(`[DbFetcherService] Translating email query for user=${authEmail}: "${userPrompt}"`);

    try {
        const rawResponse = await basketClient.complete({
            messages: [
                { role: "system", content: DB_FETCHER_SYSTEM_PROMPT },
                { role: "user", content: userPrompt },
            ],
            grammar: MONGO_QUERY_GRAMMAR,
            temperature: 0.0,
            max_tokens: 250,
        });

        const safeQuery = buildSafeMongoQuery(rawResponse, authEmail);

        logger.info(
            `[DbFetcherService] SafeQuery parsed: scope=${safeQuery.scope} inbound=${JSON.stringify(
                safeQuery.inboundFilter
            )} outbound=${JSON.stringify(safeQuery.outboundFilter)} limit=${safeQuery.limit}`
        );

        const unifiedResults: UnifiedEmail[] = [];

        // 1. Fetch Inbound Emails if scope is "all" or "inbound"
        if (safeQuery.scope === "all" || safeQuery.scope === "inbound") {
            const inboundList = await models.InboundEmail.find(safeQuery.inboundFilter)
                .sort(safeQuery.sort)
                .limit(safeQuery.limit)
                .lean();

            for (const item of inboundList) {
                unifiedResults.push({
                    id: String(item._id || item.id),
                    direction: "inbound",
                    status: "received",
                    senderEmail: item.senderEmail,
                    senderName: item.senderName || undefined,
                    to: item.to || authEmail,
                    subject: item.subject || "No Subject",
                    snippet: item.snippet || item.bodyText?.slice(0, 160) || "",
                    bodyText: item.bodyText || item.snippet || "",
                    categories: item.categories || [],
                    createdAt: (item as any).createdAt || (item as any).timestamp,
                });
            }
        }

        // 2. Fetch Outbound Emails if scope is "all", "outbound", "sent", or "draft"
        if (["all", "outbound", "sent", "draft"].includes(safeQuery.scope)) {
            const outboundList = await models.OutboundEmail.find(safeQuery.outboundFilter)
                .sort(safeQuery.sort)
                .limit(safeQuery.limit)
                .lean();

            for (const item of outboundList) {
                unifiedResults.push({
                    id: String(item._id),
                    direction: "outbound",
                    status: (item.status as any) || "sent",
                    senderEmail: item.from,
                    senderName: undefined,
                    to: item.to || [],
                    subject: item.subject || "No Subject",
                    snippet: item.body ? item.body.slice(0, 160) : "",
                    bodyText: item.body || "",
                    categories: item.category ? [item.category] : [],
                    createdAt: (item as any).sentAt || (item as any).createdAt,
                });
            }
        }

        // 3. Sort combined results by date descending and clamp to limit
        unifiedResults.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });

        const clampedResults = unifiedResults.slice(0, safeQuery.limit);

        logger.info(`[DbFetcherService] Retrieved ${clampedResults.length} unified emails for user=${authEmail}`);

        return {
            query: JSON.stringify({
                scope: safeQuery.scope,
                inboundFilter: safeQuery.inboundFilter,
                outboundFilter: safeQuery.outboundFilter,
            }),
            result: clampedResults,
            isSuccess: true,
            resultCount: clampedResults.length,
            scope: safeQuery.scope,
        };
    } catch (err: any) {
        logger.error(`[DbFetcherService] Failed to execute natural language query: ${err.message}`);
        return {
            query: JSON.stringify({ email: authEmail, scope: "all" }),
            result: [],
            isSuccess: false,
            resultCount: 0,
            scope: "all",
        };
    }
}
