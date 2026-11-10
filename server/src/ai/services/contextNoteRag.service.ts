import basketClient from "../basket.client";
import ContextNote, { IContextNote } from "../../models/contextNote.models";
import logger from "../../utils/logger.utils";

export interface RetrievedNote {
    id: string;
    title: string;
    content: string;
    tags: string[];
    denseScore: number;
    bm25Score: number;
    rrfScore: number;
}

/**
 * Calculates cosine similarity between two normalized vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
    const len = Math.min(vecA.length, vecB.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < len; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Tokenizes text for BM25 search
 */
function tokenize(text: string): string[] {
    return (text.toLowerCase().match(/\b\w+\b/g) || []).filter((w) => w.length > 1);
}

/**
 * Lightweight BM25Okapi ranking for sparse lexical search
 */
class BM25Searcher {
    private docTokens: string[][];
    private docLens: number[];
    private avgDocLen: number;
    private idf: Map<string, number> = new Map();
    private k1 = 1.5;
    private b = 0.75;

    constructor(documents: string[]) {
        this.docTokens = documents.map(tokenize);
        this.docLens = this.docTokens.map((d) => d.length);
        const totalLen = this.docLens.reduce((acc, l) => acc + l, 0);
        this.avgDocLen = this.docLens.length > 0 ? totalLen / this.docLens.length : 1;

        // Compute IDF
        const N = documents.length;
        const df = new Map<string, number>();

        for (const tokens of this.docTokens) {
            const uniqueTokens = new Set(tokens);
            for (const t of uniqueTokens) {
                df.set(t, (df.get(t) || 0) + 1);
            }
        }

        for (const [term, freq] of df.entries()) {
            // Standard BM25 IDF formulation
            const idfVal = Math.log((N - freq + 0.5) / (freq + 0.5) + 1.0);
            this.idf.set(term, Math.max(idfVal, 0.01));
        }
    }

    public score(query: string): number[] {
        const qTokens = tokenize(query);
        if (qTokens.length === 0 || this.docTokens.length === 0) {
            return new Array(this.docTokens.length).fill(0);
        }

        return this.docTokens.map((doc, docIdx) => {
            const docLen = this.docLens[docIdx];
            if (docLen === 0) return 0;

            const tfMap = new Map<string, number>();
            for (const t of doc) {
                tfMap.set(t, (tfMap.get(t) || 0) + 1);
            }

            let score = 0;
            for (const q of qTokens) {
                const tf = tfMap.get(q) || 0;
                if (tf === 0) continue;
                const idfVal = this.idf.get(q) || 0;
                const numerator = tf * (this.k1 + 1);
                const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / this.avgDocLen));
                score += idfVal * (numerator / denominator);
            }
            return score;
        });
    }
}

/**
 * Generates an embedding for a note and persists it in MongoDB
 */
export async function indexNoteEmbedding(note: IContextNote): Promise<number[]> {
    const textToEmbed = `${note.title}\n${note.content}${note.tags.length > 0 ? `\nTags: ${note.tags.join(', ')}` : ''}`.trim();
    try {
        const embedding = await basketClient.createEmbedding(textToEmbed);
        note.embedding = embedding;
        await note.save();
        logger.info(`[ContextNoteRAG] Successfully embedded note id=${note._id} dimensions=${embedding.length}`);
        return embedding;
    } catch (err: any) {
        logger.error(`[ContextNoteRAG] Failed to embed note id=${note._id}: ${err.message}`);
        return [];
    }
}

/**
 * Hybrid RAG retrieval pipeline:
 * 1. Dense retrieval using Basket Jina embeddings & Cosine similarity
 * 2. Sparse retrieval using BM25Okapi
 * 3. Reciprocal Rank Fusion (RRF) combining both signals
 */
export async function retrieveRelevantContextNotes(
    query: string,
    userEmail: string,
    topK = 3
): Promise<RetrievedNote[]> {
    if (!query || !query.trim() || !userEmail) {
        return [];
    }

    try {
        // Find all notes owned by this user
        const notes = await ContextNote.find({ userEmail }).lean();
        if (!notes || notes.length === 0) {
            return [];
        }

        logger.info(`[ContextNoteRAG] Running hybrid retrieval across ${notes.length} notes for user=${userEmail}`);

        // 1. Dense Similarity Leg
        let denseScores: number[] = new Array(notes.length).fill(0);
        try {
            const queryVec = await basketClient.createEmbedding(query);
            denseScores = notes.map((note) => {
                if (note.embedding && note.embedding.length > 0) {
                    return cosineSimilarity(queryVec, note.embedding);
                }
                return 0;
            });
        } catch (embErr: any) {
            logger.warn(`[ContextNoteRAG] Query embedding failed, falling back to BM25 only: ${embErr.message}`);
        }

        // 2. BM25 Lexical Leg
        const noteTexts = notes.map((n) => `${n.title}\n${n.content}\n${n.tags?.join(' ') || ''}`);
        const bm25Searcher = new BM25Searcher(noteTexts);
        const bm25Scores = bm25Searcher.score(query);

        // 3. Reciprocal Rank Fusion (RRF)
        // Rank by dense score (1 = highest)
        const denseRankOrder = denseScores
            .map((score, index) => ({ index, score }))
            .sort((a, b) => b.score - a.score);
        const denseRankMap = new Map<number, number>();
        denseRankOrder.forEach((item, rank) => denseRankMap.set(item.index, rank + 1));

        // Rank by BM25 score (1 = highest)
        const bm25RankOrder = bm25Scores
            .map((score, index) => ({ index, score }))
            .sort((a, b) => b.score - a.score);
        const bm25RankMap = new Map<number, number>();
        bm25RankOrder.forEach((item, rank) => bm25RankMap.set(item.index, rank + 1));

        // Compute RRF score
        const RRF_CONSTANT = 60;
        const candidates: RetrievedNote[] = notes.map((note, idx) => {
            const dRank = denseRankMap.get(idx) || notes.length;
            const bRank = bm25RankMap.get(idx) || notes.length;

            const denseScore = denseScores[idx];
            const bm25Score = bm25Scores[idx];

            // Only contribute to RRF if there is an actual positive signal
            let rrfScore = 0;
            if (denseScore > 0.25) {
                rrfScore += 1 / (RRF_CONSTANT + dRank);
            }
            if (bm25Score > 0) {
                rrfScore += 1 / (RRF_CONSTANT + bRank);
            }

            return {
                id: String(note._id),
                title: note.title,
                content: note.content,
                tags: note.tags || [],
                denseScore,
                bm25Score,
                rrfScore,
            };
        });

        // Filter out non-relevant notes (must have either a meaningful dense similarity or BM25 match)
        const relevant = candidates
            .filter((c) => c.denseScore >= 0.40 || c.bm25Score > 0.5)
            .sort((a, b) => b.rrfScore - a.rrfScore)
            .slice(0, topK);

        logger.info(
            `[ContextNoteRAG] Retrieved ${relevant.length} relevant notes for query="${query.slice(0, 40)}..." -> [${relevant.map((r) => `"${r.title}" (RRF=${r.rrfScore.toFixed(4)}, Dense=${r.denseScore.toFixed(3)}, BM25=${r.bm25Score.toFixed(2)})`).join(', ')}]`
        );

        return relevant;
    } catch (err: any) {
        logger.error(`[ContextNoteRAG] Retrieval failed: ${err.message}`);
        return [];
    }
}
