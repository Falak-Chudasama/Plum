import chatOps from "./chat.ops";
// TODO: by the end of the day, fill all these functions & Handle them well with chatOps function

function response(data: any) {
    if (!data.done) {
        chatOps.updateResponseToken(data.response, data.model);
    } else {
        chatOps.updateChat(); // 3 step process
    }
}

function thought(data: any) {
    if (!data.done) {
        chatOps.updateResponseThoughtToken(data.thought, data.model);
    }
    // handle model thought chunks
}

function info(data: any) {
    if (data.subtype === 'LOADING_MODEL') {
        if (data.loading) {}
        else {}
    }
    // handle informational system events UI changes
}

function system(data: any) {
    if (data.subtype === 'INTENT') {
        chatOps.updatePromptIntent(data.intent);
    } else if (data.subtype === 'TITLE') {
        chatOps.createChat(data.title.title);
    }
}

function error(data: any) {
    console.error(data.error);
    // handle error events UI changes
}

const socketMsgOps = {
    response,
    thought,
    info,
    system,
    error
};

export default socketMsgOps;