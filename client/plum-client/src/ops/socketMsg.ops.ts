import EmailBeingCrafted from "../store/EmailBeingCraftedStore";
import ResponseReceivingStore from "../store/ResponseReceivingStore";
import chatOps from "./chat.ops";
import SystemMsgStore from "@/store/SystemMsgStore";

const SystemMsgState = SystemMsgStore.getState();

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
    if (data.loading) { 
        SystemMsgState.setSystemMsg({
            message: data.showMessage,
            isLoading: true,
            show: true
        });
    } else {
        SystemMsgState.resetSystemMsg();
    }
}

async function system(data: any) {
    if (data.subtype === 'INTENT') {
        chatOps.updatePromptIntent(data.intent);
    } else if (data.subtype === 'TITLE') {
        await chatOps.createChat(data.title.title);
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