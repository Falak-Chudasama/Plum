import { useState, useRef, useEffect } from "react";
import globals from "../globals/globals";
import { useStore } from "zustand";
import ResponseReceivingStore from "../store/ResponseReceivingStore";

function SendButton({
    inputRef,
    sendPrompt
}) {
    const handleButtonClick = () => {
        if (!inputRef.current) return;
        const prompt = inputRef.current.value.trim();
        if (!prompt) return;
        inputRef.current.value = '';
        sendPrompt!(prompt);
    }

    return (
        <button
            onClick={() => handleButtonClick()}
            className={`
                    rounded-full
                    text-white
                    h-8
                    w-8
                    m-1
                    flex items-center
                    justify-center
                    bg-plum-primary-dark
                    hover:bg-plum-secondary
                    scale-100
                    duration-200
                    hover:cursor-pointer
                    `}>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="18" viewBox="0 0 13 18" fill="none">
                <path d="M6.28861 1.15527V16.1703M6.28861 1.15527L11.4219 6.28861M6.28861 1.15527L1.15527 6.28861" stroke="#F7F2FF" strokeWidth="2.31" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </button>
    );
}

function StopButton() {
    const { sendCommand } = globals.wsConnection;

    const handleButtonClick = () => {
        sendCommand('STOP_RESPONSE');
    }

    return (
        <button
            onClick={() => handleButtonClick()}
            className={`
                    rounded-full
                    text-white
                    h-8
                    w-8
                    m-1
                    flex items-center
                    justify-center
                    bg-plum-primary-dark
                    hover:bg-plum-secondary
                    scale-100
                    duration-200
                    hover:cursor-pointer
                    `}>
            <div className="h-4 w-4 rounded-full bg-plum-bg"></div>
        </button>
    );
}

function ChatBar() {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const sendPrompt = globals.wsConnection?.sendPrompt;
    const { receivingResponse } = useStore(ResponseReceivingStore);

    const sendPromptHandler = () => {
        if (!inputRef.current) return;
        const prompt = inputRef.current.value.trim();
        if (!prompt) return;
        inputRef.current.value = '';
        sendPrompt!(prompt);
    }

    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.key === "Enter") {
                sendPromptHandler();
            }
        };
        window.addEventListener("keydown", handleKeyPress);
        return () => {
            window.removeEventListener("keydown", handleKeyPress);
        };
    }, []);

    return (
        <div className={`
            scale-105
            fixed left-1/2 -translate-x-1/2 grid justify-center z-20
            transition-all duration-500 ease-in-out
            h-fit
            w-fit 
            bg-transparent rounded-full
            bg-cover bg-center
            ${isFocused ? "shadow-lg" : "shadow-sm"}
            mb-6
        `}>
            <div className={`
            p-0.75
            duration-500
            rounded-full 
            flex justify-between items-center
            border-[2.15px]
            placeholder-plum-primary-dark
            placeholder-select-none
            backdrop-blur-[2px]
            ${isFocused ? 'w-xl' : 'w-lg'} 
            hover:w-xl
            `} style={{
                background: "rgba(238, 229, 255, 0.8)"
            }}>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Command me..."
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="
                h-full
                flex-1
                px-4
                border-none
                rounded-full
                focus:outline-none
                focus:border-none
                transition
                duration-300
                font-cabin
                font-medium
                text-lg
                placeholder:font-ibm-plex-sans
                placeholder:font-normal
                bg-transparent
            "
                />
                {receivingResponse ? (
                    <StopButton />
                ) : (
                    <SendButton inputRef={inputRef} sendPrompt={sendPrompt} />
                )}
            </div>
        </div>
    );
}

export default ChatBar;