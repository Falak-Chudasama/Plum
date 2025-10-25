import { useEffect } from "react";
import ChatBar from "../../components/ChatBar";
import ChatBanner from "../../components/ChatBanner";

function Chats() {

    useEffect(() => {
        document.title = 'Plum | Chats';
    }, [])

    return(
        <div className="w-full h-full overflow-x-hidden">
            <div className="mt-23">
                <ChatBanner />
            </div>
            <ChatBar />
        </div>
    );
}
export default Chats