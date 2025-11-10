import { useStore } from "zustand";
import ActiveChatStore from "../store/ActiveChatStore";
import type { ResponseType, UserPromptType } from "../types/types";
import { useEffect, useState } from "react";
import ActivePromptStore from "../store/ActivePromptStore";
import ActiveResponseStore from "../store/ActiveResponseStore";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function Response({ responseObj }: { responseObj: ResponseType }) {
    if (!responseObj.response) return;
    return(
        <div className="pr-8">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {responseObj.response}
            </ReactMarkdown>
        </div>
    )
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

    return(
        <div className="items-end duration-300">
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