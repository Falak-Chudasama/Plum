import { useEffect } from "react";
import ChatBar from "../../components/ChatBar";
import ChatArea from "../../components/ChatArea";

// TODO: Add the ChatBanner component
// TODO: Fix the stuttering issue in rendering

function Chats() {
    useEffect(() => {
        document.title = 'Plum | Chats';
    }, []);

    return(
        <div className="w-screen h-[83vh] px-40 duration-300 grid justify-center items-end">
            <div className="h-full w-[100vw] overflow-y-auto px-[15vw] pt-[6vh] pb-[10vh]"> {/* I want this to be scrollable but ChatBar must be in its place and  */}
                <ChatArea />
            </div>
            <ChatBar />
        </div>
    );
}
export default Chats