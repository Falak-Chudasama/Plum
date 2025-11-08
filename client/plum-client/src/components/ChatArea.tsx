import { useStore } from "zustand";
import ActiveChatStore from "../store/ActiveChatStore";
import ActiveResponseStore from "../store/ActiveResponseStore";

function ChatArea() {
    const { chat } = useStore(ActiveChatStore);
    const { response } = useStore(ActiveResponseStore);

    return(
        <div className={`w-full duration-300 bg-plum-bg-bold ${(chat.messageCount === 0 && response.length === 0) ? 'h-[0vh] -translate-y-[0vh]' : 'h-[40vh] -translate-y-[20vh]'}`}>
            <p>
                {/* {response} */}
            </p>
        </div>
    );
}
export default ChatArea