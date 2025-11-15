import EmailBeingCrafted from "../store/EmailBeingCraftedStore";
import ResponseReceivingStore from "../store/ResponseReceivingStore";
import chatOps from "./chat.ops";

function response(data: any) {
    const { setReceivingResponse } = ResponseReceivingStore.getState();
    if (data.done === false) {
        setReceivingResponse(true);
        chatOps.updateResponseToken(data.response, data.model);
    } else if (data.done === true) {
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
    console.log('INFO:');
    console.log(data.message);
    if (data.subtype === 'LOADING_MODEL') {
        if (data.loading) {}
        else {}
    }
}

async function system(data: any) {
    console.log('SYSTEM:');
    console.log(data.message);
    if (data.subtype === 'INTENT') {
        chatOps.updatePromptIntent(data.intent);
    } else if (data.subtype === 'TITLE') {
        const savedChat = await chatOps.createChat(data.title.title);
    } else if (data.subtype === 'EMAIL') {
        const { setIsCrafted } = EmailBeingCrafted.getState()
        if (data.done) {
            chatOps.addResponseMail(data.email);
            setIsCrafted(false);
        } else {
            setIsCrafted(true);
        }
    } else if (data.subtype === 'QUERY') {
        if (data.done) {
            const { query, result, isSuccess } = data;
            chatOps.addResponseQuery({ query, result, isSuccess });
        } else {
            
        }
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