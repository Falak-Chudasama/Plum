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
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="23" viewBox="0 0 18 23" fill="none">
                <path d="M14.25 7.125C13.997 7.12484 13.745 7.15674 13.5 7.21994V4.5C13.5001 4.0154 13.3828 3.53799 13.1581 3.10862C12.9334 2.67926 12.6081 2.31074 12.2098 2.03459C11.8116 1.75845 11.3524 1.58291 10.8715 1.52301C10.3906 1.4631 9.90241 1.52061 9.44861 1.69061C9.15235 1.07981 8.65767 0.587552 8.04542 0.294305C7.43316 0.00105777 6.73954 -0.0758387 6.07792 0.0761839C5.4163 0.228206 4.82581 0.600157 4.40297 1.13124C3.98012 1.66233 3.74992 2.32114 3.75 3V3.09494C3.30667 2.9807 2.84309 2.9694 2.39472 3.0619C1.94636 3.1544 1.5251 3.34826 1.16318 3.62862C0.80127 3.90899 0.508296 4.26844 0.306685 4.67947C0.105073 5.09049 0.000168885 5.54219 0 6V13.875C0 16.1625 0.908703 18.3563 2.5262 19.9738C4.14371 21.5913 6.33751 22.5 8.625 22.5C10.9125 22.5 13.1063 21.5913 14.7238 19.9738C16.3413 18.3563 17.25 16.1625 17.25 13.875V10.125C17.2491 9.32963 16.9327 8.56709 16.3703 8.00468C15.8079 7.44226 15.0454 7.1259 14.25 7.125ZM15 13.875C15 15.5658 14.3284 17.1873 13.1328 18.3828C11.9373 19.5784 10.3158 20.25 8.625 20.25C6.93424 20.25 5.31274 19.5784 4.11719 18.3828C2.92165 17.1873 2.25 15.5658 2.25 13.875V6C2.25 5.80109 2.32902 5.61032 2.46967 5.46967C2.61032 5.32902 2.80109 5.25 3 5.25C3.19891 5.25 3.38968 5.32902 3.53033 5.46967C3.67098 5.61032 3.75 5.80109 3.75 6V10.125C3.75 10.4234 3.86853 10.7095 4.0795 10.9205C4.29048 11.1315 4.57663 11.25 4.875 11.25C5.17337 11.25 5.45952 11.1315 5.6705 10.9205C5.88147 10.7095 6 10.4234 6 10.125V3C6 2.80109 6.07902 2.61032 6.21967 2.46967C6.36032 2.32902 6.55109 2.25 6.75 2.25C6.94891 2.25 7.13968 2.32902 7.28033 2.46967C7.42098 2.61032 7.5 2.80109 7.5 3V9.375C7.5 9.67337 7.61853 9.95952 7.8295 10.1705C8.04048 10.3815 8.32663 10.5 8.625 10.5C8.92337 10.5 9.20952 10.3815 9.42049 10.1705C9.63147 9.95952 9.75 9.67337 9.75 9.375V4.5C9.75 4.30109 9.82902 4.11032 9.96967 3.96967C10.1103 3.82902 10.3011 3.75 10.5 3.75C10.6989 3.75 10.8897 3.82902 11.0303 3.96967C11.171 4.11032 11.25 4.30109 11.25 4.5V11.006C10.1829 11.2607 9.2327 11.8672 8.55241 12.7278C7.87211 13.5884 7.5014 14.653 7.5 15.75C7.5 16.0484 7.61853 16.3345 7.8295 16.5455C8.04048 16.7565 8.32663 16.875 8.625 16.875C8.92337 16.875 9.20952 16.7565 9.42049 16.5455C9.63147 16.3345 9.75 16.0484 9.75 15.75C9.75078 15.054 10.0276 14.3868 10.5197 13.8947C11.0118 13.4026 11.679 13.1258 12.375 13.125C12.6734 13.125 12.9595 13.0065 13.1705 12.7955C13.3815 12.5845 13.5 12.2984 13.5 12V10.125C13.5 9.92609 13.579 9.73532 13.7197 9.59467C13.8603 9.45402 14.0511 9.375 14.25 9.375C14.4489 9.375 14.6397 9.45402 14.7803 9.59467C14.921 9.73532 15 9.92609 15 10.125V13.875Z" fill="#F7F2FF" />
            </svg>
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