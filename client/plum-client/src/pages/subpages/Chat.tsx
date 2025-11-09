import { useEffect, useState } from "react";
import ChatBar from "../../components/ChatBar";
import ChatBanner from "../../components/ChatBanner";
import { useStore } from "zustand";
import ActiveChatStore from "../../store/ActiveChatStore";
import ActiveResponseStore from "../../store/ActiveResponseStore";
import ChatArea from "../../components/ChatArea";

function Chats() {
    const { chat } = useStore(ActiveChatStore);
    const { response } = useStore(ActiveResponseStore);

    const [expandChatBar, setExpandChatBar] = useState(false);

    useEffect(() => {
        document.title = 'Plum | Chats';
    }, []);

    useEffect(() => {}, [response, chat]);
    useEffect(() => {
        console.log(chat);
    }, [chat]);

    return(
        <div className="w-screen min-h-[80vh] px-40 overflow-x-hidden">
            {/* <ChatBanner getToTop={expandChatBar}/> */}
            <ChatArea />
            <ChatBar getToBottom={expandChatBar} />
        </div>
    );
}
export default Chats