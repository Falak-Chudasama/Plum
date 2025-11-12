type IntentName = "fetch_db" | "craft_email" | "general";

export type Candidate = {
    text: string;
    metadata: { intent: IntentName | string };
    distance: number;
};

export type IntentScoreDebug = {
    intent: IntentName;
    topCandidateText?: string;
    distance?: number;
    adjustedDistance: number;
    finalScore: number;
    matchedTokens?: string[];
    negativeTokens?: string[];
};

export type RouteResult = {
    bestIntent: IntentName;
    bestScore: number;
    ambiguous: boolean;
    scores: IntentScoreDebug[];
    reason: string;
};

export type RankedCandidate = {
    candidate: Candidate;
    intent: IntentName;
    rawDistance: number;
    adjustedDistance: number;
    finalScore: number;
    matchedTokens: string[];
    negativeTokens: string[];
};

const FETCH_TOKENS = [
    "\\bfetch\\b", "\\bget\\b", "\\bpull\\b", "\\bshow\\b", "\\bdisplay\\b", "\\bretrieve\\b",
    "\\bquery\\b", "\\bsearch\\b", "\\bfind\\b", "\\blist\\b", "\\bview\\b", "\\bdata\\b",
    "\\bdb\\b"
];

const CRAFT_TOKENS = [
    "\\bsend\\b", "\\bemail\\b", "\\bmail\\b", "\\bdraft\\b", "\\bcompose\\b", "\\breply\\b",
    "\\bsend\\b", "\\bsubject\\b", "\\bwrite\\b", "\\bmessage\\b", "\\bletter\\b"
];

const FETCH_NEGATIVE = [
    "\\bwrite\\b", "\\bdraft\\b", "\\bcompose\\b", "\\bsend\\s+mail\\b"
];

const CRAFT_NEGATIVE = [
    "\\bfrom\\s+db\\b", "\\bfrom\\s+database\\b", "\\bselect\\s+from\\b", "\\bquery\\s+db\\b", "\\bcrafting\\b", "\\bcrafted\\b"
];

const FETCH_STRONG = [
    "\\bfetch\\s+me\\b", "\\bget\\s+me\\b", "\\bgimme\\b"
];


const CRAFT_STRONG = [
    "\\bsend\\s+an?\\s+email\\b","\\bwrite\\s+a?\\s+mail\\b","\\bwrite\\s+an?\\s+email\\b", "\\bdraft\\s+an?\\s+email\\b", "\\bcompose\\s+an?\\s+email\\b"
];

const NORMAL_BOOST_PER_MATCH = 0.05;
const STRONG_BOOST = 0.25;
const PENALTY_PER_NEGATIVE = 0.15;
const BOOST_CAP = 0.6;
const AMBIGUITY_DELTA = 0.08;

const mkRegexes = (tokens: string[]) => tokens.map(t => new RegExp(t, "i"));
const FETCH_REGEX = mkRegexes(FETCH_TOKENS);
const CRAFT_REGEX = mkRegexes(CRAFT_TOKENS);
const FETCH_STRONG_REGEX = mkRegexes(FETCH_STRONG);
const CRAFT_STRONG_REGEX = mkRegexes(CRAFT_STRONG);
const FETCH_NEGATIVE_REGEX = mkRegexes(FETCH_NEGATIVE);
const CRAFT_NEGATIVE_REGEX = mkRegexes(CRAFT_NEGATIVE);

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const sanitizeDistance = (d: number) => clamp01(d);

function countMatches(query: string) {
    const q = query || "";
    const matchedFetch: string[] = [];
    const matchedFetchStrong: string[] = [];
    const matchedFetchNeg: string[] = [];
    const matchedCraft: string[] = [];
    const matchedCraftStrong: string[] = [];
    const matchedCraftNeg: string[] = [];

    for (const r of FETCH_REGEX) if (q.match(r)) matchedFetch.push(r.source);
    for (const r of FETCH_STRONG_REGEX) if (q.match(r)) matchedFetchStrong.push(r.source);
    for (const r of FETCH_NEGATIVE_REGEX) if (q.match(r)) matchedFetchNeg.push(r.source);
    for (const r of CRAFT_REGEX) if (q.match(r)) matchedCraft.push(r.source);
    for (const r of CRAFT_STRONG_REGEX) if (q.match(r)) matchedCraftStrong.push(r.source);
    for (const r of CRAFT_NEGATIVE_REGEX) if (q.match(r)) matchedCraftNeg.push(r.source);

    return {
        matchedFetch,
        matchedFetchStrong,
        matchedFetchNeg,
        matchedCraft,
        matchedCraftStrong,
        matchedCraftNeg
    };
}

function computeBoostForIntent(intent: IntentName, query: string) {
    const m = countMatches(query);
    let matches = 0;
    let strong = 0;
    let negatives = 0;

    if (intent === "fetch_db") {
        matches = m.matchedFetch.length;
        strong = m.matchedFetchStrong.length;
        negatives = m.matchedFetchNeg.length;
    } else if (intent === "craft_email") {
        matches = m.matchedCraft.length;
        strong = m.matchedCraftStrong.length;
        negatives = m.matchedCraftNeg.length;
    } else {
        const anyFound = m.matchedFetch.length + m.matchedFetchStrong.length + m.matchedCraft.length + m.matchedCraftStrong.length;
        if (anyFound === 0) return 0.08;
        return 0;
    }

    const base = matches * NORMAL_BOOST_PER_MATCH;
    const strongBoost = strong > 0 ? STRONG_BOOST : 0;
    const penalty = negatives * PENALTY_PER_NEGATIVE;

    let boost = base + strongBoost - penalty;
    if (boost < 0) boost = 0;
    boost = Math.min(BOOST_CAP, boost);
    return clamp01(boost);
}

export function routeIntent(query: string, candidates: Candidate[]): RouteResult {
    if (!candidates || candidates.length === 0) {
        return {
            bestIntent: "general",
            bestScore: 1,
            ambiguous: true,
            scores: [
                { intent: "general", adjustedDistance: 1, finalScore: 0 }
            ],
            reason: "no candidates"
        };
    }

    const topPerIntent = new Map<IntentName, Candidate | null>([
        ["fetch_db", null],
        ["craft_email", null],
        ["general", null]
    ]);

    for (const c of candidates) {
        const intentRaw = (c.metadata?.intent ?? "general") as string;
        const intent: IntentName = (intentRaw === "fetch_db" || intentRaw === "craft_email") ? (intentRaw as IntentName) : "general";
        const cur = topPerIntent.get(intent);
        if (!cur || c.distance < cur.distance) topPerIntent.set(intent, c);
    }

    const intents: IntentName[] = ["fetch_db", "craft_email", "general"];
    const scores: IntentScoreDebug[] = intents.map((intent) => {
        const cand = topPerIntent.get(intent) ?? null;
        const rawDistance = cand ? sanitizeDistance(cand.distance) : 1;
        const boost = computeBoostForIntent(intent, query);
        const adjustedDistance = clamp01(rawDistance - boost);
        const finalScore = clamp01(1 - adjustedDistance);
        return {
            intent,
            topCandidateText: cand?.text,
            distance: rawDistance,
            adjustedDistance,
            finalScore,
            matchedTokens: [],
            negativeTokens: []
        } as IntentScoreDebug;
    });

    scores.sort((a, b) => a.adjustedDistance - b.adjustedDistance);
    const best = scores[0];
    const second = scores[1] ?? { adjustedDistance: 1, finalScore: 0 } as IntentScoreDebug;
    const ambiguous = Math.abs(best.adjustedDistance - second.adjustedDistance) < AMBIGUITY_DELTA;
    const reasonParts: string[] = [`best=${best.intent}`, `distance=${best.adjustedDistance.toFixed(3)}`];
    if (ambiguous) reasonParts.push("AMBIGUOUS");

    return {
        bestIntent: best.intent,
        bestScore: best.adjustedDistance,
        ambiguous,
        scores,
        reason: reasonParts.join("; ")
    };
}

export function rankCandidates(query: string, candidates: Candidate[]): RankedCandidate[] {
    const results: RankedCandidate[] = [];
    for (const c of candidates) {
        const intentRaw = (c.metadata?.intent ?? "general") as string;
        const intent: IntentName = (intentRaw === "fetch_db" || intentRaw === "craft_email") ? (intentRaw as IntentName) : "general";
        const rawDistance = sanitizeDistance(c.distance);
        const boost = computeBoostForIntent(intent, query);
        const adjustedDistance = clamp01(rawDistance - boost);
        const finalScore = clamp01(1 - adjustedDistance);
        results.push({
            candidate: c,
            intent,
            rawDistance,
            adjustedDistance,
            finalScore,
            matchedTokens: [],
            negativeTokens: []
        });
    }
    results.sort((a, b) => a.adjustedDistance - b.adjustedDistance);
    return results;
}

const reRankingOps = {
    routeIntent,
    rankCandidates
};

export default reRankingOps;