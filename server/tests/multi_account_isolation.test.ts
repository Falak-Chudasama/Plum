import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import chatOps from "../src/controllers/chat.controllers";
import categoryOps from "../src/controllers/category.controllers";
import Chats from "../src/models/chat";
import CategoryModel from "../src/models/category";
import InboundEmail from "../src/models/inboundEmail.models";
import { buildSafeMongoQuery } from "../src/ai/grammars/mongoQuery.grammar";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:4090/plum";

const USER_A = "account-a@somaiya.edu";
const USER_B = "account-b@gmail.com";

before(async () => {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(MONGO_URI);
    }
    // Clean up any test fixtures from previous runs
    await Chats.deleteMany({ email: { $in: [USER_A, USER_B] } });
    await CategoryModel.deleteMany({ email: { $in: [USER_A, USER_B] } });
    await InboundEmail.deleteMany({ email: { $in: [USER_A, USER_B] } });
});

after(async () => {
    // Clean up test fixtures
    await Chats.deleteMany({ email: { $in: [USER_A, USER_B] } });
    await CategoryModel.deleteMany({ email: { $in: [USER_A, USER_B] } });
    await InboundEmail.deleteMany({ email: { $in: [USER_A, USER_B] } });
    await mongoose.disconnect();
});

test("Multi-Account Isolation: Chats", async () => {
    // 1. User A creates Chat A
    const chatA = await chatOps.create({
        email: USER_A,
        title: "Account A Confidential Discussion",
        userPrompts: [],
        systemPrompts: [],
        responses: [],
        archived: false,
        isViewed: true,
        messageCount: 0,
    } as any);

    assert.ok(chatA._id, "Chat A created");

    // 2. User B creates Chat B
    const chatB = await chatOps.create({
        email: USER_B,
        title: "Account B Private Strategy",
        userPrompts: [],
        systemPrompts: [],
        responses: [],
        archived: false,
        isViewed: true,
        messageCount: 0,
    } as any);

    assert.ok(chatB._id, "Chat B created");

    // 3. User A attempts to access Chat B by ID -> Must be blocked / null
    const crossAccessResult = await chatOps.getById(String(chatB._id), USER_A);
    assert.equal(crossAccessResult, null, "User A must NOT be able to access User B's chat by ID");

    // 4. User B attempts to access Chat A by ID -> Must be blocked / null
    const crossAccessResultB = await chatOps.getById(String(chatA._id), USER_B);
    assert.equal(crossAccessResultB, null, "User B must NOT be able to access User A's chat by ID");

    // 5. User A cannot list User B's chats
    const listA = await chatOps.getList(USER_A, 20);
    assert.ok(listA.chats.some(c => String(c._id) === String(chatA._id)), "User A sees Chat A");
    assert.ok(!listA.chats.some(c => String(c._id) === String(chatB._id)), "User A MUST NOT see Chat B");

    // 6. User A cannot update User B's chat
    const hackedChatB = {
        _id: chatB._id,
        title: "Defaced by Account A",
    };
    const updateResult = await chatOps.update(hackedChatB as any, USER_A);
    assert.equal(updateResult, null, "User A must NOT be able to update User B's chat");

    const unchangedChatB = await chatOps.getById(String(chatB._id), USER_B);
    assert.equal(unchangedChatB?.title, "Account B Private Strategy", "Chat B title must remain unchanged");

    // 7. User A cannot delete User B's chat
    const deleteResult = await chatOps.del(String(chatB._id), USER_A);
    assert.equal(deleteResult, null, "User A must NOT be able to delete User B's chat");

    const stillExistingChatB = await chatOps.getById(String(chatB._id), USER_B);
    assert.ok(stillExistingChatB, "Chat B must still exist after unauthorized deletion attempt");
});

test("Multi-Account Isolation: Categories", async () => {
    // 1. User A creates categories
    const catA1 = await categoryOps.create({
        category: "SecretProjectA",
        description: "Confidential for A",
        alert: false,
        email: USER_A,
        color: "blue",
    } as any, USER_A);

    // 2. User B creates categories
    const catB1 = await categoryOps.create({
        category: "FinancialsB",
        description: "Confidential for B",
        alert: true,
        email: USER_B,
        color: "red",
    } as any, USER_B);

    assert.ok(catA1);
    assert.ok(catB1);

    // 3. User A lists categories -> Must only see their own
    const userACategories = await categoryOps.findUserCategories(USER_A);
    assert.ok(userACategories.some(c => c.category === "SecretProjectA"));
    assert.ok(!userACategories.some(c => c.category === "FinancialsB"), "User A MUST NOT see User B's category");

    // 4. User B lists categories -> Must only see their own
    const userBCategories = await categoryOps.findUserCategories(USER_B);
    assert.ok(userBCategories.some(c => c.category === "FinancialsB"));
    assert.ok(!userBCategories.some(c => c.category === "SecretProjectA"), "User B MUST NOT see User A's category");

    // 5. User A cannot delete User B's category
    const deleteAttempt = await categoryOps.deleteCategory("FinancialsB", USER_A);
    assert.equal(deleteAttempt, null, "User A must NOT be able to delete User B's category");

    const stillExistingCatB = await CategoryModel.findOne({ category: "FinancialsB", email: USER_B });
    assert.ok(stillExistingCatB, "Category B must remain intact");
});

test("Multi-Account Isolation: Generated Mongo Queries", async () => {
    // Insert mock emails for User A and User B
    await InboundEmail.create([
        {
            email: USER_A,
            id: "msg-a-1",
            threadId: "th-a-1",
            senderEmail: "prof@somaiya.edu",
            subject: "Final Grades Released",
            bodyText: "Grades for Account A are posted.",
            categories: ["Study"],
            isViewed: false,
        },
        {
            email: USER_B,
            id: "msg-b-1",
            threadId: "th-b-1",
            senderEmail: "bank@alert.com",
            subject: "Wire Transfer Received",
            bodyText: "Account B received $50,000.",
            categories: ["Financials"],
            isViewed: false,
        },
    ]);

    // User A generates a query searching for all emails
    const querySpecA = buildSafeMongoQuery(JSON.stringify({ limit: 10 }), USER_A);
    const emailsFoundA = await InboundEmail.find(querySpecA.filter).limit(querySpecA.limit);

    assert.ok(emailsFoundA.some(e => e.id === "msg-a-1"), "User A finds their own email");
    assert.ok(!emailsFoundA.some(e => e.id === "msg-b-1"), "User A CANNOT find User B's email");

    // User B generates a query searching for all emails
    const querySpecB = buildSafeMongoQuery(JSON.stringify({ limit: 10 }), USER_B);
    const emailsFoundB = await InboundEmail.find(querySpecB.filter).limit(querySpecB.limit);

    assert.ok(emailsFoundB.some(e => e.id === "msg-b-1"), "User B finds their own email");
    assert.ok(!emailsFoundB.some(e => e.id === "msg-a-1"), "User B CANNOT find User A's email");
});

