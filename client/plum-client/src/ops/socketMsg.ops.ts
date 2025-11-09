import ResponseReceivingStore from "../store/ResponseReceivingStore";
import chatOps from "./chat.ops";

function response(data: any) {
    const { setReceivingResponse } = ResponseReceivingStore.getState();
    if (!data.done) {
        setReceivingResponse(true);
        chatOps.updateResponseToken(data.response, data.model);
    } else {
        setReceivingResponse(false);
        chatOps.updateChat();
    }
}

function thought(data: any) {
    if (!data.done) {
        chatOps.updateResponseThoughtToken(data.thought, data.model);
    }
}

function info(data: any) {
    if (data.subtype === 'LOADING_MODEL') {
        if (data.loading) {}
        else {}
    }
}

async function system(data: any) {
    if (data.subtype === 'INTENT') {
        chatOps.updatePromptIntent(data.intent);
    } else if (data.subtype === 'TITLE') {
        const savedChat = await chatOps.createChat(data.title.title);
    }
}

function error(data: any) {
    console.error(data.error);
}

const socketMsgOps = {
    response,
    thought,
    info,
    system,
    error
};

export default socketMsgOps;