import { create } from "zustand";
import type { ChatType } from "../types/types";
import utils from "../utils/utils";

const defaultChat: ChatType = {
    title: '',
    email: utils.parseGmailCookies().gmailCookie,
    userPrompts: [],
    systemPrompts: [],
    responses: [],
    archived: false,
    isViewed: true,
    messageCount: 0,
};

// const defaultChat = {
//     _id: "69166b306044e058ef5a72f2",
//     title: "User Greetings Assistant",
//     email: "falak.chudasama@somaiya.edu",

//     userPrompts: [
//         {
//             prompt: "Hey Plum",
//             intention: {
//                 intent: "general",
//                 confidence: 0.67,
//                 _id: "69166b306044e058ef5a72f5"
//             },
//             chatCount: 1,
//             _id: "69166b306044e058ef5a72f4",
//             createdAt: "2025-11-13T23:35:12.739Z",
//             updatedAt: "2025-11-13T23:35:12.739Z"
//         }
//     ],

//     systemPrompts: [],

//     responses: [
//         {
//             response: "Understood. I’ll fetch the emails you need.",
//             thought: "<no_thoughts>",
//             chatCount: 2,
//             modelResponded: "hermes-3-llama-3.2-3b",
//             _id: "69166b306044e058ef5a72f6",
//             createdAt: "2025-11-13T23:35:12.739Z",
//             updatedAt: "2025-11-13T23:35:12.739Z",

//             query: {
//                 query: `[{"$expr":{"$eq":["$senderEmail","notifications@example.com"]}}]`,
//                 isSuccess: true,

//                 result: [
//                     {
//                         _id: "68f09ab965721f149dd30001",
//                         email: "falak.chudasama@somaiya.edu",
//                         id: "mail01",
//                         threadId: "mail01",
//                         to: "falak@example.com",
//                         cc: "",
//                         bcc: "",
//                         senderEmail: "notifications@example.com",
//                         senderName: "System Bot",
//                         subject: "Your account update",
//                         parsedDate: { weekday: "Monday", day: "12", month: "January", year: "2026", time: "10:15:22" },
//                         snippet: "Your account has been updated...",
//                         bodyText: "Your account has been updated successfully.",
//                         attachments: [],
//                         timestamp: "2026-01-12T04:45:22.000Z",
//                         sizeEstimate: 10240,
//                         categories: ["Updates"],
//                         isViewed: false,
//                         createdAt: "2026-01-12T05:00:00.000Z",
//                         updatedAt: "2026-01-12T05:00:00.000Z"
//                     },
//                     {
//                         _id: "68f09ab965721f149dd30002",
//                         email: "falak.chudasama@somaiya.edu",
//                         id: "mail02",
//                         threadId: "mail02",
//                         to: "falak@example.com",
//                         cc: "",
//                         bcc: "",
//                         senderEmail: "notifications@example.com",
//                         senderName: "System Bot",
//                         subject: "Password changed",
//                         parsedDate: { weekday: "Tuesday", day: "13", month: "January", year: "2026", time: "08:05:41" },
//                         snippet: "Your password was changed...",
//                         bodyText: "Your password was recently changed.",
//                         attachments: [],
//                         timestamp: "2026-01-13T02:35:41.000Z",
//                         sizeEstimate: 9800,
//                         categories: ["Security"],
//                         isViewed: false,
//                         createdAt: "2026-01-13T03:00:00.000Z",
//                         updatedAt: "2026-01-13T03:00:00.000Z"
//                     },
//                     {
//                         _id: "68f09ab965721f149dd30003",
//                         email: "falak.chudasama@somaiya.edu",
//                         id: "mail03",
//                         threadId: "mail03",
//                         to: "falak@example.com",
//                         senderEmail: "notifications@example.com",
//                         senderName: "System Bot",
//                         subject: "Security alert",
//                         parsedDate: { weekday: "Wednesday", day: "14", month: "January", year: "2026", time: "11:20:10" },
//                         snippet: "Unusual login detected...",
//                         bodyText: "We detected a login attempt.",
//                         attachments: [],
//                         timestamp: "2026-01-14T05:50:10.000Z",
//                         sizeEstimate: 9000,
//                         categories: ["Security"],
//                         isViewed: false,
//                         createdAt: "2026-01-14T06:00:00.000Z",
//                         updatedAt: "2026-01-14T06:00:00.000Z"
//                     },
//                     {
//                         _id: "68f09ab965721f149dd30004",
//                         email: "falak.chudasama@somaiya.edu",
//                         id: "mail04",
//                         threadId: "mail04",
//                         to: "falak@example.com",
//                         senderEmail: "notifications@example.com",
//                         senderName: "System Bot",
//                         subject: "New login device",
//                         parsedDate: { weekday: "Thursday", day: "15", month: "January", year: "2026", time: "07:30:00" },
//                         snippet: "A new device logged in...",
//                         bodyText: "A new device accessed your account.",
//                         attachments: [],
//                         timestamp: "2026-01-15T02:00:00.000Z",
//                         sizeEstimate: 9500,
//                         categories: ["Security"],
//                         isViewed: true,
//                         createdAt: "2026-01-15T02:10:00.000Z",
//                         updatedAt: "2026-01-15T02:10:00.000Z"
//                     },
//                     {
//                         _id: "68f09ab965721f149dd30005",
//                         email: "falak.chudasama@somaiya.edu",
//                         id: "mail05",
//                         threadId: "mail05",
//                         to: "falak@example.com",
//                         senderEmail: "notifications@example.com",
//                         senderName: "System Bot",
//                         subject: "Backup codes generated",
//                         parsedDate: { weekday: "Friday", day: "16", month: "January", year: "2026", time: "12:11:00" },
//                         snippet: "Backup codes ready...",
//                         bodyText: "Your backup codes have been generated.",
//                         attachments: [],
//                         timestamp: "2026-01-16T06:41:00.000Z",
//                         sizeEstimate: 8700,
//                         categories: ["Security"],
//                         isViewed: true,
//                         createdAt: "2026-01-16T06:45:00.000Z",
//                         updatedAt: "2026-01-16T06:45:00.000Z"
//                     },
//                     {
//                         _id: "68f09ab965721f149dd30006",
//                         email: "falak.chudasama@somaiya.edu",
//                         id: "mail06",
//                         threadId: "mail06",
//                         to: "falak@example.com",
//                         senderEmail: "notifications@example.com",
//                         senderName: "System Bot",
//                         subject: "Subscription reminder",
//                         parsedDate: { weekday: "Saturday", day: "17", month: "January", year: "2026", time: "09:45:12" },
//                         snippet: "Your subscription renews soon...",
//                         bodyText: "Your subscription will renew next week.",
//                         attachments: [],
//                         timestamp: "2026-01-17T04:15:12.000Z",
//                         sizeEstimate: 9200,
//                         categories: ["Billing"],
//                         isViewed: false,
//                         createdAt: "2026-01-17T04:30:00.000Z",
//                         updatedAt: "2026-01-17T04:30:00.000Z"
//                     },
//                     {
//                         _id: "68f09ab965721f149dd30007",
//                         email: "falak.chudasama@somaiya.edu",
//                         id: "mail07",
//                         threadId: "mail07",
//                         to: "falak@example.com",
//                         senderEmail: "notifications@example.com",
//                         senderName: "System Bot",
//                         subject: "Monthly report",
//                         parsedDate: { weekday: "Sunday", day: "18", month: "January", year: "2026", time: "14:10:44" },
//                         snippet: "Your report is ready...",
//                         bodyText: "Here is your monthly account report.",
//                         attachments: [],
//                         timestamp: "2026-01-18T08:40:44.000Z",
//                         sizeEstimate: 12000,
//                         categories: ["Reports"],
//                         isViewed: false,
//                         createdAt: "2026-01-18T09:00:00.000Z",
//                         updatedAt: "2026-01-18T09:00:00.000Z"
//                     },
//                     {
//                         _id: "68f09ab965721f149dd30008",
//                         email: "falak.chudasama@somaiya.edu",
//                         id: "mail08",
//                         threadId: "mail08",
//                         to: "falak@example.com",
//                         senderEmail: "notifications@example.com",
//                         senderName: "System Bot",
//                         subject: "Service notice",
//                         parsedDate: { weekday: "Monday", day: "19", month: "January", year: "2026", time: "13:00:11" },
//                         snippet: "Scheduled maintenance...",
//                         bodyText: "Service maintenance scheduled tonight.",
//                         attachments: [],
//                         timestamp: "2026-01-19T07:30:11.000Z",
//                         sizeEstimate: 7600,
//                         categories: ["Updates"],
//                         isViewed: false,
//                         createdAt: "2026-01-19T07:45:00.000Z",
//                         updatedAt: "2026-01-19T07:45:00.000Z"
//                     },
//                     {
//                         _id: "68f09ab965721f149dd30009",
//                         email: "falak.chudasama@somaiya.edu",
//                         id: "mail09",
//                         threadId: "mail09",
//                         to: "falak@example.com",
//                         senderEmail: "notifications@example.com",
//                         senderName: "System Bot",
//                         subject: "New device synced",
//                         parsedDate: { weekday: "Tuesday", day: "20", month: "January", year: "2026", time: "11:55:32" },
//                         snippet: "A device was synced...",
//                         bodyText: "A new device synced to your account.",
//                         attachments: [],
//                         timestamp: "2026-01-20T06:25:32.000Z",
//                         sizeEstimate: 9400,
//                         categories: ["Security"],
//                         isViewed: false,
//                         createdAt: "2026-01-20T06:40:00.000Z",
//                         updatedAt: "2026-01-20T06:40:00.000Z"
//                     },
//                     {
//                         _id: "68f09ab965721f149dd30010",
//                         email: "falak.chudasama@somaiya.edu",
//                         id: "mail10",
//                         threadId: "mail10",
//                         to: "falak@example.com",
//                         senderEmail: "notifications@example.com",
//                         senderName: "System Bot",
//                         subject: "Verification complete",
//                         parsedDate: { weekday: "Wednesday", day: "21", month: "January", year: "2026", time: "16:22:09" },
//                         snippet: "Your verification is complete...",
//                         bodyText: "Your account has been fully verified.",
//                         attachments: [],
//                         timestamp: "2026-01-21T10:52:09.000Z",
//                         sizeEstimate: 8800,
//                         categories: ["Updates"],
//                         isViewed: true,
//                         createdAt: "2026-01-21T11:00:00.000Z",
//                         updatedAt: "2026-01-21T11:00:00.000Z"
//                     }
//                 ]
//             }
//         }
//     ],

//     archived: false,
//     isViewed: true,
//     messageCount: 2,
//     createdAt: "2025-11-13T23:35:12.534Z",
//     updatedAt: "2025-11-13T23:35:12.739Z",
//     __v: 0
// };

type ActiveChatState = {
    chat: ChatType,
    setChatState: (chat: ChatType) => void,
    resetActiveChatState: () => void
};

const ActiveChatStore = create<ActiveChatState>((set) => ({
    chat: defaultChat,
    setChatState: (chat) => { set({ chat }) },
    resetActiveChatState: () => { set({ chat: defaultChat }) }
}));

export default ActiveChatStore;