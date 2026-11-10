import test from "node:test";
import assert from "node:assert/strict";
import { buildCategoryGrammar, validateCategory, escapeGbnfLiteral } from "../src/ai/grammars/category.grammar";
import { EMAIL_COMPOSITION_GRAMMAR, validateAndSanitizeCraftedEmail } from "../src/ai/grammars/emailComposition.grammar";
import { MONGO_QUERY_GRAMMAR, buildSafeMongoQuery } from "../src/ai/grammars/mongoQuery.grammar";
import { INTENT_GRAMMAR, parseIntentOutput } from "../src/ai/grammars/intent.grammar";
import { CHAT_TITLE_GRAMMAR, parseChatTitle } from "../src/ai/grammars/chatTitle.grammar";
import basketClient, { BasketError } from "../src/ai/basket.client";

test("GBNF - Category grammar builds dynamic rules with safe escaping", () => {
    const categories = ["Session", "Work \"Projects\"", "Back\\Slash", "Unicode 🚀"];
    const grammar = buildCategoryGrammar(categories);

    assert.ok(grammar.includes('"Session"'), "Must include Session");
    assert.ok(grammar.includes('"Work \\"Projects\\""'), "Must escape quotes");
    assert.ok(grammar.includes('"Back\\\\Slash"'), "Must escape backslashes");
    assert.ok(grammar.includes('"Other"'), "Must include Other fallback");
});

test("GBNF - Category validation strictly respects account boundary", () => {
    const allowed = ["Session", "Deadline", "Study"];

    assert.equal(validateCategory("Session", allowed), "Session");
    assert.equal(validateCategory('"Deadline"', allowed), "Deadline");
    assert.equal(validateCategory("deadline", allowed), "Deadline"); // case-insensitive match
    assert.equal(validateCategory("HackedCategory", allowed), "Other", "Unknown category must fall back to Other");
    assert.equal(validateCategory("Other", allowed), "Other");
    assert.equal(validateCategory("", allowed), "Other");
});

test("GBNF - Email composition validator enforces fields and sets authenticated sender", () => {
    const raw = JSON.stringify({
        to: ["friend@example.com"],
        cc: ["cc@example.com"],
        bcc: [],
        subject: "Meeting Tomorrow",
        body: "Hi Friend,\n\nLooking forward to catching up.\n\nBest,\nUser",
    });

    const result = validateAndSanitizeCraftedEmail(raw, "user@somaiya.edu");

    assert.equal(result.from, "user@somaiya.edu", "Sender must be forced to authenticated email");
    assert.deepEqual(result.to, ["friend@example.com"]);
    assert.equal(result.subject, "Meeting Tomorrow");
    assert.ok(result.body.includes("Looking forward"));
    assert.equal(result.status, "unsaved");
});

test("GBNF - Email composition rejects invalid outputs and empty body", () => {
    assert.throws(() => {
        validateAndSanitizeCraftedEmail("not json", "user@somaiya.edu");
    }, /not valid JSON/);

    assert.throws(() => {
        validateAndSanitizeCraftedEmail(JSON.stringify({ to: ["a@b.com"], subject: "S", body: "" }), "user@somaiya.edu");
    }, /body cannot be empty/);
});

test("GBNF - Safe Mongo query generation enforces tenant isolation and allowlist", () => {
    const raw = JSON.stringify({
        category: "Deadline",
        senderEmail: "prof@somaiya.edu",
        subject: "Exam",
        limit: 15,
    });

    const querySpec = buildSafeMongoQuery(raw, "student@somaiya.edu");

    // MANDATORY TENANT ISOLATION
    assert.equal(querySpec.filter.email, "student@somaiya.edu", "Tenant filter MUST match authenticated user");
    assert.equal(querySpec.limit, 15);
    assert.ok(querySpec.filter.senderEmail, "Filter includes senderEmail");
    assert.ok(querySpec.filter.subject, "Filter includes subject");
});

test("GBNF - Safe Mongo query rejects unauthorized fields and caps excessive limits", () => {
    const injectionAttempt = JSON.stringify({
        $where: "this.password != null",
        category: "Session",
    });

    assert.throws(() => {
        buildSafeMongoQuery(injectionAttempt, "student@somaiya.edu");
    }, /Unauthorized query parameter/);

    // Limit clamping
    const hugeLimit = JSON.stringify({
        category: "Study",
        limit: 999999,
    });
    const querySpec = buildSafeMongoQuery(hugeLimit, "student@somaiya.edu");
    assert.equal(querySpec.limit, 20, "Query limit must be clamped to max 20");
});

test("GBNF - Intent grammar parser returns valid intent", () => {
    assert.equal(parseIntentOutput("craft_email").intent, "craft_email");
    assert.equal(parseIntentOutput('"fetch_db"').intent, "fetch_db");
    assert.equal(parseIntentOutput("general").intent, "general");
    assert.equal(parseIntentOutput("unknown_gibberish").intent, "general");
});

test("GBNF - Chat title parser extracts title safely", () => {
    assert.equal(parseChatTitle('{"title": "Project Discussion"}'), "Project Discussion");
    assert.equal(parseChatTitle('title: Meeting Notes'), "Meeting Notes");
    assert.equal(parseChatTitle(""), "New Conversation");
});

test("BasketClient - Formats request with headers and handles failures cleanly", async () => {
    // Test with bounded 1ms timeout to verify error propagation (no hanging, no mock fallback)
    const client = basketClient;

    await assert.rejects(
        async () => {
            await client.complete({
                messages: [{ role: "user", content: "test" }],
                timeoutMs: 1,
            });
        },
        (err: any) => {
            assert.ok(err instanceof BasketError, "Must throw BasketError");
            assert.ok(err.message.includes("Basket inference failed") || err.message.includes("timeout"));
            assert.ok(err.requestId, "Must contain requestId");
            return true;
        }
    );
});

