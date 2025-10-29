import { useEffect } from "react";
import ChatBar from "../../components/ChatBar";
import ChatBanner from "../../components/ChatBanner";
import ActiveResponseStore from "../../store/ActiveResponseStore";
import { useStore } from "zustand";

function Chats() {
    const { response } = useStore(ActiveResponseStore);

    useEffect(() => {
        document.title = 'Plum | Chats';
    }, []);

    return(
        <div className="w-full h-full overflow-x-hidden">
            <div className="mt-23">
                <ChatBanner />
            </div>
            <ChatBar />
            <p>
                {response}
            </p>
        </div>
    );
}
export default Chats