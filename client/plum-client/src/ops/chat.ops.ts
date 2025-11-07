import ActiveChatStore from "../store/ActiveChatStore";
import ActivePromptStore from "../store/ActivePromptStore";
import ActiveResponseStore from "../store/ActiveResponseStore";
import ChatCountStore from "../store/ChatCountStore";
import type { CraftedMailType, IntentionType, QueryType } from "../types/types";


function createChat(title: string) {
    const { chat: chatState, setChatState } = ActiveChatStore.getState();
    setChatState({
        ...chatState,
        title
    })
}

function updateChat() {
    const { chat, setChatState } = ActiveChatStore.getState();
    const { chatCount, setChatCount } = ChatCountStore.getState();
    const { prompt } = ActivePromptStore.getState();
    const { response } = ActiveResponseStore.getState();

    setChatCount(chatCount + 1);
    setChatState({
        ...chat,
        userPrompts: [
            ...chat.userPrompts,
            prompt
        ],
        responses: [
            ...chat.responses,
            response
        ],
        messageCount: chatCount + 1
    });
    // server API call
}



function createPrompt(prompt: string) {
    const { chatCount, setChatCount: setCount } = ChatCountStore.getState();
    const { prompt: promptState, setPrompt } = ActivePromptStore.getState();
    setCount(chatCount + 1);
    setPrompt({
        ...promptState,
        prompt,
        intention: promptState.intention,
        chatCount: chatCount + 1,
    });
}

function updatePromptIntent(intention: IntentionType) {
    const { prompt: promptState, setPrompt } = ActivePromptStore.getState();
    setPrompt({
        ...promptState,
        intention,
        prompt: promptState.prompt,
        chatCount: promptState.chatCount
    });
}



function updateResponseToken(token: string, modelResponded: string) {
    const { chatCount: count } = ChatCountStore.getState();
    const { response: responseState, setResponse } = ActiveResponseStore.getState();
    setResponse({
        ...responseState,
        response: responseState.response + token,
        modelResponded,
        chatCount: count + 1,
    });
}

function updateResponseThoughtToken(token: string, modelResponded: string) {
    const { chatCount: count } = ChatCountStore.getState();
    const { response: responseState, setResponse } = ActiveResponseStore.getState();
    setResponse({
        ...responseState,
        thought: responseState.thought + token,
        modelResponded,
        chatCount: count + 1,
    });
}

function addResponseMail(craftedMail: CraftedMailType) {
    const { response: responseState, setResponse } = ActiveResponseStore.getState();
    setResponse({
        ...responseState,
        craftedMail
    });
}

function addResponseQuery(query: QueryType) {
    const { response: responseState, setResponse } = ActiveResponseStore.getState();
    setResponse({
        ...responseState,
        query
    });
}


const chatOps = {
    createChat,
    updateChat,
    createPrompt,
    updatePromptIntent,
    updateResponseToken,
    updateResponseThoughtToken,
    addResponseMail,
    addResponseQuery
};

export default chatOps;