function response(data: any) {
    // handle model response chunks
}

function thought(data: any) {
    // handle model thought chunks
}

function info(data: any) {
    // handle informational system events
}

function system(data: any) {
    // handle system-level structured events (INTENT, CHAT_TITLE, etc.)
}

function error(data: any) {
    // handle error events
}

const socketMsgOps = {
    response,
    thought,
    info,
    system,
    error
};

export default socketMsgOps;