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
    sim: number;
    ruleReduction: number;
    priorAdj: number;
    finalScore: number;
    matchedTokens?: string[];
    negativeSignals?: string[];
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
    sim: number;
    finalScore: number;
    matchedTokens: string[];
    negativeSignals: string[];
};

const FETCH_TOKENS = [
    "\\bfetch\\b", "\\bget\\b", "\\bpull\\b", "\\bshow\\b", "\\bdisplay\\b", "\\bretrieve\\b",
    "\\brows\\b", "\\bquery\\b", "\\bselect\\b", "\\border(s)?\\b", "\\bdb\\b", "\\blog(s)?\\b",
    "\\bsearch\\b", "\\bread\\b", "\\bextract\\b", "\\bfind\\b", "\\blist\\b", "\\bview\\b",
    "\\bdata(base)?\\b", "\\btable\\b", "\\brecord(s)?\\b", "\\blookup\\b", "\\bcheck\\b"
];

const CRAFT_TOKENS = [
    "\\bemail\\b", "\\bmail\\b", "\\bsubject\\b", "\\bdraft\\b", "\\bcompose\\b", "\\breply\\b",
    "\\bsend\\b", "\\btemplate\\b", "\\bapolog(y|ize)\\b", "\\bthank(s|ing)?\\b", "\\bhr\\b",
    "\\bwrite\\b", "\\bmessage\\b", "\\bletter\\b", "\\bresponse\\b", "\\bnotif(y|ication)\\b"
];

const FETCH_NEGATIVE = [
    "\\bwrite\\b", "\\bdraft\\b", "\\bcompose\\b", "\\bcreate\\s+(an?\\s+)?email\\b",
    "\\bsend\\s+(an?\\s+)?email\\b", "\\breply\\s+to\\b"
];

const CRAFT_NEGATIVE = [
    "\\bfrom\\s+(the\\s+)?(database|db|table)\\b", "\\bfrom\\s+logs?\\b",
    "\\bquery\\s+(the\\s+)?(database|db)\\b", "\\bselect\\s+from\\b",
    "\\bretrieve\\s+data\\b", "\\bfetch\\s+data\\b"
];

const FETCH_STRONG = [
    "\\bselect\\s+.*\\s+from\\b", "\\bquery\\s+(the\\s+)?(database|db)\\b",
    "\\bfetch\\s+.*\\s+from\\s+(database|db|table)\\b", "\\bget\\s+.*\\s+from\\s+(database|db)\\b",
    "\\bshow\\s+me\\s+(the\\s+)?(data|records|rows|orders|logs)\\b"
];

const CRAFT_STRONG = [
    "\\bwrite\\s+(an?\\s+)?email\\b", "\\bdraft\\s+(an?\\s+)?email\\b",
    "\\bcompose\\s+(an?\\s+)?email\\b", "\\bsend\\s+(an?\\s+)?email\\b",
    "\\bemail\\s+(template|about|regarding|to)\\b", "\\bapology\\s+email\\b",
    "\\bthank\\s+you\\s+email\\b"
];

const BOOST_FETCH_PER_MATCH = 0.05;
const BOOST_CRAFT_PER_MATCH = 0.05;
const BOOST_FETCH_STRONG = 0.15;
const BOOST_CRAFT_STRONG = 0.15;
const BOOST_CAP_FETCH = 0.25;
const BOOST_CAP_CRAFT = 0.25;
const BOOST_GENERAL_IF_NO_FETCH_OR_CRAFT = 0.10;

const PENALTY_PER_NEGATIVE = 0.08;
const PENALTY_CAP = 0.24;

const PRIOR_ADJUSTMENTS: Record<IntentName, number> = {
    fetch_db: 0.0,
    craft_email: 0.0,
    general: 0.05
};

const AMBIGUITY_DELTA = 0.08;
const MIN_SIMILARITY_THRESHOLD = 0.25;

const mkRegexes = (tokens: string[]) => tokens.map((t) => new RegExp(t, "i"));
const FETCH_REGEX = mkRegexes(FETCH_TOKENS);
const CRAFT_REGEX = mkRegexes(CRAFT_TOKENS);
const FETCH_STRONG_REGEX = mkRegexes(FETCH_STRONG);
const CRAFT_STRONG_REGEX = mkRegexes(CRAFT_STRONG);
const FETCH_NEGATIVE_REGEX = mkRegexes(FETCH_NEGATIVE);
const CRAFT_NEGATIVE_REGEX = mkRegexes(CRAFT_NEGATIVE);

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

function sanitizeDistance(distance: number) {
    return Math.max(0, Math.min(1, distance));
}

function pickTopPerIntent(candidates: Candidate[]) {
    const top: Record<string, Candidate> = {};
    for (const c of candidates) {
        const intent = (c.metadata?.intent ?? "general") as string;
        if (!top[intent] || c.distance < top[intent].distance) {
            top[intent] = c;
        }
    }
    return top;
}

function extractTokenMatches(query: string) {
    const q = query || "";
    const matchedFetch = new Set<string>();
    const matchedCraft = new Set<string>();
    const matchedFetchStrong = new Set<string>();
    const matchedCraftStrong = new Set<string>();
    const matchedFetchNegative = new Set<string>();
    const matchedCraftNegative = new Set<string>();
    for (const r of FETCH_REGEX) {
        if (q.match(r)) matchedFetch.add(r.source);
    }
    for (const r of CRAFT_REGEX) {
        if (q.match(r)) matchedCraft.add(r.source);
    }
    for (const r of FETCH_STRONG_REGEX) {
        if (q.match(r)) matchedFetchStrong.add(r.source);
    }
    for (const r of CRAFT_STRONG_REGEX) {
        if (q.match(r)) matchedCraftStrong.add(r.source);
    }
    for (const r of FETCH_NEGATIVE_REGEX) {
        if (q.match(r)) matchedFetchNegative.add(r.source);
    }
    for (const r of CRAFT_NEGATIVE_REGEX) {
        if (q.match(r)) matchedCraftNegative.add(r.source);
    }
    return {
        fetchMatches: Array.from(matchedFetch),
        craftMatches: Array.from(matchedCraft),
        fetchStrongMatches: Array.from(matchedFetchStrong),
        craftStrongMatches: Array.from(matchedCraftStrong),
        fetchNegativeMatches: Array.from(matchedFetchNegative),
        craftNegativeMatches: Array.from(matchedCraftNegative)
    };
}

function computeRuleAdjustmentsFromQuery(query: string) {
    const matches = extractTokenMatches(query);
    let fetchReduction = clamp01(matches.fetchMatches.length * BOOST_FETCH_PER_MATCH);
    if (matches.fetchStrongMatches.length > 0) fetchReduction += BOOST_FETCH_STRONG;
    fetchReduction = Math.min(BOOST_CAP_FETCH, fetchReduction);
    const fetchPenalty = clamp01(Math.min(PENALTY_CAP, matches.fetchNegativeMatches.length * PENALTY_PER_NEGATIVE));
    let craftReduction = clamp01(matches.craftMatches.length * BOOST_CRAFT_PER_MATCH);
    if (matches.craftStrongMatches.length > 0) craftReduction += BOOST_CRAFT_STRONG;
    craftReduction = Math.min(BOOST_CAP_CRAFT, craftReduction);
    const craftPenalty = clamp01(Math.min(PENALTY_CAP, matches.craftNegativeMatches.length * PENALTY_PER_NEGATIVE));
    const anyFound =
        matches.fetchMatches.length > 0 ||
        matches.craftMatches.length > 0 ||
        matches.fetchStrongMatches.length > 0 ||
        matches.craftStrongMatches.length > 0;
    const generalReduction = anyFound ? 0 : BOOST_GENERAL_IF_NO_FETCH_OR_CRAFT;
    return {
        fetchReduction,
        craftReduction,
        generalReduction,
        fetchPenalty,
        craftPenalty,
        fetchMatchedTokens: [...matches.fetchMatches, ...matches.fetchStrongMatches],
        craftMatchedTokens: [...matches.craftMatches, ...matches.craftStrongMatches],
        fetchNegativeMatches: matches.fetchNegativeMatches,
        craftNegativeMatches: matches.craftNegativeMatches
    };
}

export function routeIntent(query: string, candidates: Candidate[]): RouteResult {
    if (!candidates || candidates.length === 0) {
        return {
            bestIntent: "general",
            bestScore: 0,
            ambiguous: true,
            scores: [
                {
                    intent: "general",
                    adjustedDistance: 1,
                    distance: 1,
                    sim: 0,
                    ruleReduction: BOOST_GENERAL_IF_NO_FETCH_OR_CRAFT,
                    priorAdj: PRIOR_ADJUSTMENTS.general,
                    finalScore: clamp01(1 - Math.max(0, 1 - (BOOST_GENERAL_IF_NO_FETCH_OR_CRAFT + PRIOR_ADJUSTMENTS.general)))
                }
            ],
            reason: "no candidates provided"
        };
    }

    const topPerIntent = pickTopPerIntent(candidates);
    const canonicalIntents: IntentName[] = ["fetch_db", "craft_email", "general"];
    const adjustments = computeRuleAdjustmentsFromQuery(query);

    const scored: IntentScoreDebug[] = canonicalIntents.map((intent) => {
        const cand = (topPerIntent[intent] ?? null) as Candidate | null;
        const rawDistance = cand ? sanitizeDistance(cand.distance) : 1.0;
        let ruleReduction = 0;
        let penalty = 0;
        let negativeSignals: string[] = [];
        if (intent === "fetch_db") {
            ruleReduction = adjustments.fetchReduction;
            penalty = adjustments.fetchPenalty;
            negativeSignals = adjustments.fetchNegativeMatches;
        }
        if (intent === "craft_email") {
            ruleReduction = adjustments.craftReduction;
            penalty = adjustments.craftPenalty;
            negativeSignals = adjustments.craftNegativeMatches;
        }
        if (intent === "general") {
            ruleReduction = adjustments.generalReduction;
        }
        const priorAdj = PRIOR_ADJUSTMENTS[intent] ?? 0;
        const totalAdjustment = clamp01(ruleReduction + priorAdj - penalty);
        const adjustedDistance = clamp01(rawDistance - totalAdjustment);
        const sim = clamp01(1 - adjustedDistance);
        const finalScore = sim < MIN_SIMILARITY_THRESHOLD ? 0 : sim;
        return {
            intent,
            topCandidateText: cand?.text,
            distance: rawDistance,
            adjustedDistance,
            sim,
            ruleReduction,
            priorAdj,
            finalScore,
            matchedTokens: intent === "fetch_db" ? adjustments.fetchMatchedTokens : intent === "craft_email" ? adjustments.craftMatchedTokens : [],
            negativeSignals
        };
    });

    scored.sort((a, b) => b.finalScore - a.finalScore);
    const best = scored[0];
    const second = scored[1] ?? { finalScore: 0 };
    const scoreDelta = best.finalScore - second.finalScore;
    const ambiguous = scoreDelta < AMBIGUITY_DELTA || best.finalScore < MIN_SIMILARITY_THRESHOLD;

    const reasonParts: string[] = [];
    if (adjustments.fetchMatchedTokens.length) reasonParts.push(`fetch tokens: ${adjustments.fetchMatchedTokens.join(", ")}`);
    if (adjustments.craftMatchedTokens.length) reasonParts.push(`craft tokens: ${adjustments.craftMatchedTokens.join(", ")}`);
    if (adjustments.fetchNegativeMatches.length) reasonParts.push(`fetch negative: ${adjustments.fetchNegativeMatches.join(", ")}`);
    if (adjustments.craftNegativeMatches.length) reasonParts.push(`craft negative: ${adjustments.craftNegativeMatches.join(", ")}`);
    if (!adjustments.fetchMatchedTokens.length && !adjustments.craftMatchedTokens.length) reasonParts.push("no fetch/craft tokens -> general boosted");
    reasonParts.push(`best: ${best.intent}`);
    reasonParts.push(`score: ${best.finalScore.toFixed(3)}`);
    reasonParts.push(`delta: ${scoreDelta.toFixed(3)}`);
    if (ambiguous) reasonParts.push("AMBIGUOUS");

    return {
        bestIntent: best.intent,
        bestScore: best.finalScore,
        ambiguous,
        scores: scored,
        reason: reasonParts.join("; ")
    };
}

export default function rankCandidates(query: string, candidates: Candidate[]): RankedCandidate[] {
    const adjustments = computeRuleAdjustmentsFromQuery(query);
    const results: RankedCandidate[] = [];
    for (const c of candidates) {
        const intentRaw = (c.metadata?.intent ?? "general") as string;
        const intent = intentRaw === "fetch_db" || intentRaw === "craft_email" || intentRaw === "general" ? (intentRaw as IntentName) : "general";
        const rawDistance = sanitizeDistance(c.distance);
        let ruleReduction = 0;
        let penalty = 0;
        let matchedTokens: string[] = [];
        let negativeSignals: string[] = [];
        if (intent === "fetch_db") {
            ruleReduction = adjustments.fetchReduction;
            penalty = adjustments.fetchPenalty;
            matchedTokens = adjustments.fetchMatchedTokens;
            negativeSignals = adjustments.fetchNegativeMatches;
        } else if (intent === "craft_email") {
            ruleReduction = adjustments.craftReduction;
            penalty = adjustments.craftPenalty;
            matchedTokens = adjustments.craftMatchedTokens;
            negativeSignals = adjustments.craftNegativeMatches;
        } else {
            ruleReduction = adjustments.generalReduction;
        }
        const priorAdj = PRIOR_ADJUSTMENTS[intent] ?? 0;
        const totalAdjustment = clamp01(ruleReduction + priorAdj - penalty);
        const adjustedDistance = clamp01(rawDistance - totalAdjustment);
        const sim = clamp01(1 - adjustedDistance);
        const finalScore = sim < MIN_SIMILARITY_THRESHOLD ? 0 : sim;
        results.push({
            candidate: c,
            intent,
            rawDistance,
            adjustedDistance,
            sim,
            finalScore,
            matchedTokens,
            negativeSignals
        });
    }
    results.sort((a, b) => b.finalScore - a.finalScore);
    return results;
}