import { useEffect } from "react";
import ChatBar from "../../components/ChatBar";
import ChatBanner from "../../components/ChatBanner";
import { useStore } from "zustand";
import ActiveChatStore from "../../store/ActiveChatStore";
import ActiveResponseStore from "../../store/ActiveResponseStore";

function Chats() {
    const { chat } = useStore(ActiveChatStore);
    const { response } = useStore(ActiveResponseStore);

    useEffect(() => {
        document.title = 'Plum | Chats';
    }, []);

    useEffect(() => {
        console.log(response);
    }, [response]);

    return(
        <div className="w-full h-full overflow-x-hidden">
            <div className={`${(chat.messageCount === 0 && response.length === 0) ? 'mt-23' : 'mt-0'} duration-300`}>
                <ChatBanner />
            </div>
            <ChatBar />
            <p>{response}</p>
        </div>
    );
}
export default Chats