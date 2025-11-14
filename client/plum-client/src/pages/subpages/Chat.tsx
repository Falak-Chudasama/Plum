import { useEffect } from "react";
import ChatBar from "../../components/ChatBar";
import ChatArea from "../../components/ChatArea";

// TODO: Add the ChatBanner component

function Chats() {
    useEffect(() => {
        document.title = 'Plum | Chats';
    }, []);

    return(
        <div className="w-screen h-[83vh] px-40 duration-300 grid justify-center items-end">
            <div className="h-full w-[100vw] overflow-y-auto px-[15vw] pt-[8vh] pb-[12vh]">
                <ChatArea />
            </div>
            <ChatBar />
        </div>
    );
}
export default Chats