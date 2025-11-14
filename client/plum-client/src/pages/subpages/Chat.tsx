import { useEffect, useState } from "react";
import ChatBar from "../../components/ChatBar";
import ChatArea from "../../components/ChatArea";
import ChatBanner from "../../components/ChatBanner";
import { useStore } from "zustand";
import ActiveChatStore from "../../store/ActiveChatStore";
import ActivePromptStore from "../../store/ActivePromptStore";

function Chats() {
    useEffect(() => {
        document.title = 'Plum | Chats';
    }, []);

    const [isNewChat, setNewChat] = useState(false);
    const { chat } = useStore(ActiveChatStore);
    const { prompt } = useStore(ActivePromptStore);

    useEffect(() => {
        if (chat.messageCount > 0 || prompt.prompt !== '') {
            setNewChat(false);
        } else {
            setNewChat(true);
        }
    }, [chat, prompt])


    return(
        <div className={`w-screen h-[83vh] px-40 duration-300 grid justify-center ${isNewChat ? 'items-center' : 'items-end'}`}>
            {(
                isNewChat ? (
                    <ChatBanner getToTop={isNewChat} />
                ) : <></>
            )}
            <div className="h-full w-[100vw] overflow-y-auto px-[15vw] pt-[8vh] pb-[12vh]">
                <ChatArea />
            </div>
            <ChatBar isNewChat={isNewChat} />
        </div>
    );
}
export default Chats