import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import basketClient from "../src/ai/basket.client";
import { categorizeEmail } from "../src/ai/services/categorizer.service";
import { craftEmail } from "../src/ai/services/emailCrafter.service";
import { fetchDbEmails } from "../src/ai/services/dbFetcher.service";
import { INTENT_GRAMMAR, parseIntentOutput } from "../src/ai/grammars/intent.grammar";
import { CHAT_TITLE_GRAMMAR, parseChatTitle } from "../src/ai/grammars/chatTitle.grammar";
import CategoryModel from "../src/models/category";
import { InboundEmailType } from "../src/types/types";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:4090/plum";
const TEST_USER = "falak.chudasama@somaiya.edu";

before(async () => {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(MONGO_URI);
    }
});

after(async () => {
    await mongoose.disconnect();
});

test("Live Basket Integration 1: General Chat Generation", async () => {
    console.log("\n--- Testing Live 1: General Chat ---");
    const response = await basketClient.complete({
        messages: [
            { role: "system", content: "You are Plum assistant. Be direct and concise." },
            { role: "user", content: "What is 15 plus 27? Answer with the number only." },
        ],
        temperature: 0.1,
    });

    console.log("Basket response:", response);
    assert.ok(response && response.length > 0, "Response must not be empty");
    assert.ok(response.includes("42"), `Expected answer to contain 42, got: ${response}`);
});

test("Live Basket Integration 2: Email Category Classification with Dynamic GBNF Grammar", async () => {
    console.log("\n--- Testing Live 2: Category Classification ---");
    // Get existing categories for user
    const cats = await CategoryModel.find({ email: TEST_USER });
    console.log("User categories in DB:", cats.map(c => c.category));

    const sampleEmail: InboundEmailType = {
        email: TEST_USER,
        id: "test-inbound-001",
        threadId: "th-001",
        senderName: "Prof. Sharma",
        senderEmail: "sharma@somaiya.edu",
        subject: "Midterm Exam Schedule and Submission Deadline",
        bodyText: "Please be aware that the submission deadline for your project is this Friday. No extensions.",
        date: new Date(),
        isViewed: false,
    };

    const assignedCategory = await categorizeEmail(sampleEmail, TEST_USER);
    console.log("Assigned Category:", assignedCategory);

    assert.ok(assignedCategory && assignedCategory.length > 0);
    // Should match one of user's categories or "Other"
    const allowed = [...cats.map(c => c.category), "Other"];
    assert.ok(allowed.includes(assignedCategory), `Assigned category ${assignedCategory} must be in ${allowed.join(", ")}`);
});

test("Live Basket Integration 3: Email Composition with Structured Grammar & Sanitization", async () => {
    console.log("\n--- Testing Live 3: Email Composition ---");
    const instruction = "Draft an email to dr.patel@somaiya.edu requesting an appointment to review project progress tomorrow.";
    
    const crafted = await craftEmail(instruction, "", TEST_USER, "Falak Chudasama");
    console.log("Crafted Email Result:", JSON.stringify(crafted, null, 2));

    assert.equal(crafted.from, TEST_USER, "Authoritative sender must match authenticated user");
    assert.ok(crafted.to.some(r => r.includes("dr.patel@somaiya.edu")), "Recipient list must include target email");
    assert.ok(crafted.subject && crafted.subject.length > 0, "Subject must not be empty");
    assert.ok(crafted.body && crafted.body.length > 0, "Body must not be empty");
    assert.equal(crafted.status, "unsaved");
});

test("Live Basket Integration 4: Intent Classification with GBNF Grammar", async () => {
    console.log("\n--- Testing Live 4: Intent Classification ---");
    const testCases = [
        { prompt: "Draft a quick reply to Alice saying I will attend", expected: "craft_email" },
        { prompt: "Find emails from Google sent last week", expected: "fetch_db" },
        { prompt: "What is the capital of France?", expected: "general" },
    ];

    for (const tc of testCases) {
        const rawIntent = await basketClient.complete({
            messages: [
                {
                    role: "system",
                    content: `Classify the user prompt into one intent:
- 'craft_email' if the user asks to compose, draft, rewrite, write, or reply to an email.
- 'fetch_db' if the user asks to search, find, check, view, list, or retrieve past emails or notifications.
- 'general' for standard conversation, questions, or other tasks.
Output ONLY the intent identifier.`
                },
                { role: "user", content: tc.prompt },
            ],
            grammar: INTENT_GRAMMAR,
            temperature: 0.0,
            max_tokens: 10,
        });

        const parsed = parseIntentOutput(rawIntent);
        console.log(`Prompt: "${tc.prompt}" -> Intent: ${parsed.intent} (raw: ${rawIntent.trim()})`);
        assert.equal(parsed.intent, tc.expected, `Expected ${tc.expected} for prompt: ${tc.prompt}`);
    }
});

test("Live Basket Integration 5: Chat Title Generation with GBNF Grammar", async () => {
    console.log("\n--- Testing Live 5: Chat Title Generation ---");
    const conversationSnippet = "User: How do I organize my inbox for semester exams?\nPlum: You can create a category named 'Exams' and set priority alerts.";

    const rawTitle = await basketClient.complete({
        messages: [
            {
                role: "system",
                content: `You are a conversation titling assistant.
Analyze the user and assistant exchange and generate a clean, third-person title summarizing the discussion.
Rules:
1. Always output a JSON object: {"title": "..."}
2. Maximum 6 words.
3. No emojis or punctuation marks in the title.
4. Third-person objective phrasing only.`
            },
            {
                role: "user",
                content: `Generate a title for this conversation:\n\n${conversationSnippet}`
            },
        ],
        grammar: CHAT_TITLE_GRAMMAR,
        temperature: 0.0,
        max_tokens: 30,
    });

    console.log("Raw Title Output:", rawTitle);
    const title = parseChatTitle(rawTitle);
    console.log("Parsed Title:", title);

    assert.ok(title && title.length > 0, "Title must not be empty");
    assert.notEqual(title, "New Conversation", "Title should be specifically extracted");
});

test("Live Basket Integration 6: MongoDB Query Generation with Safe Schema & Tenant Filtering", async () => {
    console.log("\n--- Testing Live 6: Safe Mongo Query Generation ---");
    const queryResult = await fetchDbEmails(
        "Find emails from harsham@somaiya.edu",
        TEST_USER
    );

    console.log("Query Result generated:", queryResult.query);
    console.log("Is Success:", queryResult.isSuccess);
    console.log("Emails matched count:", queryResult.resultCount);

    assert.ok(queryResult.isSuccess, "Query execution should succeed");
    assert.ok(queryResult.query.includes(TEST_USER), "Generated query spec MUST enforce authenticated user email");
    assert.ok(queryResult.resultCount > 0, "Should retrieve matching emails from live DB");
    assert.ok(queryResult.result.every(e => e.email === TEST_USER), "Every retrieved email must belong to authenticated user");
});
