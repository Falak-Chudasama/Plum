import { useState, useRef, useEffect } from "react";
import globals from "../globals/globals";
import { useStore } from "zustand";
import ActiveResponseStore from "../store/ActiveResponseStore";

function ChatBar(getToBottom: boolean) {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const sendPrompt = globals.wsConnection?.sendPrompt;

    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.key === "Enter") {
                handleButtonClick();
            }
        };
        window.addEventListener("keydown", handleKeyPress);
        return () => {
            window.removeEventListener("keydown", handleKeyPress);
        };
    }, []);

    const handleButtonClick = () => {
        if (!inputRef.current) return;
        const prompt = inputRef.current.value.trim();
        if (!prompt) return;
        sendPrompt(prompt);
    }

    return (
        <div className={`
            scale-105
            -translate-y-20
            fixed left-1/2 -translate-x-1/2 grid justify-center z-20
            transition-all duration-500 ease-in-out
            h-fit
            w-fit 
            bg-transparent rounded-full
            bg-cover bg-center
            ${isFocused ? "shadow-lg" : "shadow-sm"}
            ${getToBottom ? 'bottom-12' : 'bottom-1/3'}
        `}>
            <div className={`
            p-0.75
            duration-500
            rounded-full 
            flex justify-between items-center
            bg-plum-bg-bold
            border-[2.15px]
            placeholder-plum-primary-dark
            placeholder-select-none
            backdrop-blur-[2.3px]
            ${isFocused ? 'w-xl' : 'w-lg'} 
            hover:w-xl
            `}>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Command me Anything..."
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
            </div>
        </div>
    );
}

export default ChatBar;