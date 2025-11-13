import { useStore } from "zustand";
import ActiveChatStore from "../store/ActiveChatStore";
import type { ResponseType, UserPromptType } from "../types/types";
import { useEffect, useState } from "react";
import ActivePromptStore from "../store/ActivePromptStore";
import ActiveResponseStore from "../store/ActiveResponseStore";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import apis from "../apis/apis";

function Response({ responseObj }: { responseObj: ResponseType }) {
    if (!responseObj.response) return;
    // const { isCrafted } = useStore(EmailBeingCrafted);

    function SendMailBtn() {
        return (
            <button onClick={() => apis.sendMail(responseObj.craftedMail)} className="bg-plum-secondary flex cursor-pointer items-center justify-center rounded-full px-3 py-1 hover:px-4 duration-200 font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="9" viewBox="0 0 10 9" fill="none" className="scale-160">
                    <path d="M5.39751 2.93681L2.86945 4.39639M2.98912 4.76915L3.29178 6.25795C3.45754 7.07334 3.54042 7.48103 3.74396 7.64403C3.92075 7.78561 4.15381 7.83573 4.37318 7.77941C4.62575 7.71451 4.86895 7.37695 5.35536 6.70188L8.47363 2.37386C8.94839 1.71488 9.18579 1.38544 9.16914 1.12773C9.15471 0.90383 9.0367 0.699435 8.85001 0.574988C8.63518 0.431757 8.23115 0.472588 7.42309 0.554272L2.10664 1.09171C1.28128 1.17514 0.868604 1.21686 0.686197 1.4028C0.527784 1.56428 0.454469 1.79081 0.488236 2.01448C0.527117 2.27204 0.837103 2.54763 1.45708 3.09881L2.62563 4.13771C2.73211 4.23237 2.78536 4.27972 2.82759 4.33515C2.86509 4.38438 2.89608 4.43821 2.91981 4.49535C2.94654 4.55973 2.96073 4.62952 2.98912 4.76915Z" stroke="#F7F2FF" stroke-width="0.96" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <span className="text-plum-bg ml-1.5 text-sm">
                    Send
                </span>
            </button>
        )
    }

    function DraftMailBt() {
        return (
            <button onClick={() => apis.draftMail(responseObj.craftedMail)} className="bg-plum-primary flex cursor-pointer items-center justify-center rounded-full px-3 py-1 hover:px-4 duration-200 font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 11 11" fill="none" className="scale-140">
                    <path d="M10.3882 5.19794L7.0113 8.51965C6.78132 8.74669 5.55343 9.57565 5.32052 9.34685C5.08762 9.11805 5.9377 7.91714 6.16826 7.6901L9.54511 4.36839C9.65778 4.25936 9.80863 4.19875 9.96541 4.19951C10.1222 4.20028 10.2725 4.26237 10.384 4.3725C10.4394 4.42595 10.4834 4.48992 10.5136 4.56065C10.5439 4.63138 10.5596 4.70744 10.56 4.78435C10.5604 4.86127 10.5454 4.93748 10.5159 5.00851C10.4864 5.07954 10.4429 5.14395 10.3882 5.19794Z" fill="#D1C8EB" />
                    <path d="M7.39204 0H0.821369C0.601299 0.002631 0.391252 0.0924234 0.237286 0.249689C0.0833202 0.406954 -0.00199928 0.618857 3.55803e-05 0.838933V9.72107C-0.00199928 9.94114 0.0833202 10.153 0.237286 10.3103C0.391252 10.4676 0.601299 10.5574 0.821369 10.56H7.39204C7.61211 10.5574 7.82215 10.4676 7.97612 10.3103C8.13008 10.153 8.2154 9.94114 8.21337 9.72107V8.12533L7.3979 8.9408C7.38617 8.95253 6.26564 9.97333 5.43257 9.97333C5.33522 9.97684 5.23818 9.96044 5.14739 9.92513C5.0566 9.88982 4.97397 9.83636 4.90457 9.768C4.43524 9.2928 4.86937 8.54773 5.0571 8.22507C5.25197 7.88838 5.47995 7.57196 5.73764 7.28053L8.21337 4.8048V0.838933C8.2154 0.618857 8.13008 0.406954 7.97612 0.249689C7.82215 0.0924234 7.61211 0.002631 7.39204 0ZM1.77764 1.17333H4.69337C4.84896 1.17333 4.99818 1.23514 5.10821 1.34516C5.21823 1.45519 5.28004 1.60441 5.28004 1.76C5.28004 1.91559 5.21823 2.06481 5.10821 2.17484C4.99818 2.28486 4.84896 2.34667 4.69337 2.34667H1.77764C1.62204 2.34667 1.47282 2.28486 1.3628 2.17484C1.25278 2.06481 1.19097 1.91559 1.19097 1.76C1.19097 1.60441 1.25278 1.45519 1.3628 1.34516C1.47282 1.23514 1.62204 1.17333 1.77764 1.17333ZM4.1067 7.04587L1.76004 7.04C1.67846 7.04819 1.59608 7.03919 1.5182 7.01358C1.44031 6.98797 1.36866 6.94633 1.30787 6.89133C1.24707 6.83633 1.19848 6.76919 1.16522 6.69426C1.13196 6.61932 1.11478 6.53825 1.11478 6.45627C1.11478 6.37428 1.13196 6.29321 1.16522 6.21827C1.19848 6.14334 1.24707 6.07621 1.30787 6.02121C1.36866 5.96621 1.44031 5.92456 1.5182 5.89895C1.59608 5.87335 1.67846 5.86435 1.76004 5.87253H4.1067C4.2623 5.87253 4.41152 5.93434 4.52154 6.04436C4.63156 6.15439 4.69337 6.30361 4.69337 6.4592C4.69337 6.61479 4.63156 6.76402 4.52154 6.87404C4.41152 6.98406 4.2623 7.04587 4.1067 7.04587ZM6.45337 4.69333H1.76004C1.60444 4.69333 1.45522 4.63152 1.3452 4.5215C1.23518 4.41148 1.17337 4.26226 1.17337 4.10667C1.17337 3.95107 1.23518 3.80185 1.3452 3.69183C1.45522 3.58181 1.60444 3.52 1.76004 3.52H6.45337C6.60896 3.52 6.75818 3.58181 6.8682 3.69183C6.97823 3.80185 7.04004 3.95107 7.04004 4.10667C7.04004 4.26226 6.97823 4.41148 6.8682 4.5215C6.75818 4.63152 6.60896 4.69333 6.45337 4.69333Z" fill="#D1C8EB" />
                </svg>
                <span className="text-plum-bg ml-1 text-sm">
                    Draft
                </span>
            </button>
        )
    }

    return (
        <div className="pr-8">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {responseObj.response}
            </ReactMarkdown>

            {(
                responseObj.craftedMail ? (
                    <div className="mt-3 py-2 px-3 text-[15px] rounded-xl bg-plum-bg-bold text-plum-secondary max-w-[45vw] duration-300">
                        {Object.keys(responseObj.craftedMail).map((field) => {
                            if (['to', 'cc', 'bcc'].includes(field) && responseObj.craftedMail[field].length > 0) {
                                return (
                                    <div key={field}>
                                        <span className="font-semibold capitalize">{field}</span>
                                        <span className="ml-1.5">
                                            {responseObj.craftedMail[field]?.join(', ')}
                                        </span>
                                    </div>
                                );
                            } else if (field === 'subject' && responseObj.craftedMail[field] !== '') {
                                return (
                                    <div className="mt-2">
                                        <span className="font-semibold">Subject</span>
                                        <span className="ml-1.5">{responseObj.craftedMail?.subject}</span>
                                    </div>
                                )
                            } else if (field === 'body' && responseObj.craftedMail[field] !== '') {
                                return (
                                    <div className="text-plum-primary-dark my-2">
                                        {responseObj.craftedMail[field]}
                                    </div>
                                );
                            }
                            return (<></>);
                        })}

                        <div className="flex gap-x-1 justify-end m-2">
                            <SendMailBtn />
                            <DraftMailBt />
                        </div>
                    </div>
                ) : (<></>)
            )}

            {/* {isCrafted && (
                <div className="mt-3 py-2 px-3 rounded-lg bg-plum-bg-bold text-plum-primary text-sm font-medium">
                    Email is being crafted...
                </div>
            )} */}
        </div>
    );
}

function Prompt({ promptObj }: { promptObj: UserPromptType }) {
    if (!promptObj.prompt) return null;

    return (
        <div className="px-3 py-1 text-md text-plum-bg rounded-2xl bg-plum-primary max-w-[40vw] break-words whitespace-pre-wrap">
            {promptObj.prompt}
        </div>
    );
}

function ChatArea() {
    const { chat } = useStore(ActiveChatStore);
    const { prompt: activePromptObj } = useStore(ActivePromptStore);
    const { response: activeResponseObj } = useStore(ActiveResponseStore);

    const sortMessages = () => {
        return [...chat.userPrompts, ...chat.responses].sort((msgA, msgB) => msgA.chatCount - msgB.chatCount);
    }

    const [sortedMessages, setSortedMessages] = useState(sortMessages());

    useEffect(() => {
        setSortedMessages(sortMessages());
    }, [chat]);

    return (
        <div className="items-end duration-300 text-[18px]">
            {
                [...sortedMessages, activePromptObj, activeResponseObj].map((msg) => {
                    if ('prompt' in msg) {
                        return (
                            <div id={msg.prompt + msg.createdAt} className="flex justify-end mb-3">
                                <Prompt promptObj={msg} />
                            </div>
                        );
                    } else if ('response' in msg) {
                        return (
                            <div id={msg.response + msg.createdAt} className="mb-8">
                                <Response responseObj={msg} />
                            </div>
                        );
                    }
                })
            }
        </div>
    );
}
export default ChatArea