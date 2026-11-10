import test from "node:test";
import assert from "node:assert/strict";
import basketClient from "../src/ai/basket.client";
import axios from "axios";
import { buildCategoryGrammar, validateCategory } from "../src/ai/grammars/category.grammar";

const BASKET_BASE_URL = "http://api.basket.com";

test("Concurrent Execution: Simultaneous Inference from Plum and Quince", async () => {
    console.log("\n=== Starting Simultaneous Plum + Quince Requests ===");

    // Plum: Grammar-constrained category classification
    const plumCategories = ["Session", "Deadline", "Opportunity", "Other"];
    const plumGrammar = buildCategoryGrammar(["Session", "Deadline", "Opportunity"]);

    const plumPromise = basketClient.complete({
        messages: [
            { role: "system", content: "Assign this email to one category from the list. Output only the category name." },
            { role: "user", content: "Reminder: All PhD students must submit their draft thesis by 5 PM tomorrow." },
        ],
        grammar: plumGrammar,
        temperature: 0.0,
    });

    // Quince: Unconstrained voice/text turn
    const quincePromise = axios.post(
        `${BASKET_BASE_URL}/chat/text`,
        {
            text: "Calculate 100 divided by 4. Respond with only the final number.",
            synthesize_speech: false,
            application: "quince",
        },
        {
            headers: { "Content-Type": "application/json" },
            timeout: 30000,
        }
    );

    const startTime = Date.now();
    const [plumResult, quinceResult] = await Promise.all([plumPromise, quincePromise]);
    const durationMs = Date.now() - startTime;

    console.log(`Simultaneous execution completed in ${durationMs}ms`);
    console.log("Plum Result (Grammar-Constrained):", plumResult);
    console.log("Quince Raw Response data preview:", quinceResult.data.slice(0, 300));

    // 1. Verify Plum Output conforms to its GBNF grammar
    const validatedPlum = validateCategory(plumResult, plumCategories);
    console.log("Validated Plum Category:", validatedPlum);
    assert.equal(validatedPlum, "Deadline", "Plum must accurately categorize the email as Deadline");

    // 2. Verify Quince Output contains the mathematical answer (25)
    assert.ok(quinceResult.data.includes("25"), "Quince must receive the correct mathematical calculation (25)");

    // 3. Verify Isolation: Quince was NOT constrained by Plum's GBNF grammar!
    // Plum grammar only allowed "Session" | "Deadline" | "Opportunity" | "Other".
    // Quince's answer was "25", proving Quince was not forced into Plum's grammar rules!
    assert.ok(!quinceResult.data.includes("Deadline"), "Quince response must NOT contain Plum's category output");
    assert.ok(!plumResult.includes("25"), "Plum response must NOT contain Quince's mathematical output");

    // 4. Verify LLM Model is still loaded on 7001
    const modelCheck = await axios.get("http://127.0.0.1:7001/v1/models");
    assert.ok(modelCheck.data.data.some((m: any) => m.id === "quince-llm"), "Model quince-llm must remain loaded");

    console.log("SUCCESS: Both Plum and Quince completed concurrently with complete grammar and context isolation!");
});

