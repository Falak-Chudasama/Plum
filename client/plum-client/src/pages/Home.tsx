import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import utils from "../utils/utils";
import components from "../components/components";
import Mails from "./subpages/Mails";
import Chats from "./subpages/Chat";
import SubpageStore from "../store/SubpageStore";
import useCategories from "../hooks/useCategories";
import useUser from "../hooks/useUser";
import useSelectedMailStore from "../store/SelectedMailStore";
import FormPopup from "../popup/FormPopup";
import { useStore } from "zustand";
import PopupFormStore from "../store/PopupFormStore";
import useWebSocket from "../hooks/useWebSocket";
import globals from "../globals/globals";
import SideBarExpansionStore from "../store/SideBarExpansionStore";
import ActiveChatStore from "../store/ActiveChatStore";
import ActivePromptStore from "../store/ActivePromptStore";
import ActiveResponseStore from "../store/ActiveResponseStore";

const { PlumLogo } = components;
const { gmailCookie, pictureCookie } = utils.parseGmailCookies();

function Header() {
    const profileImage: string = pictureCookie;

    return (
        <header className="grid h-[17vh]">
            <div className="px-5 py-3 w-full h-fit bg-plum-bg-bold flex items-center justify-between">
                <PlumLogo scale={0.85} textBold />
                <div className="h-12 w-12 rounded-full border-3 border-plum-primary bg-cover bg-center"
                    style={{ backgroundImage: `url(${profileImage})` }}
                ></div>
            </div>
            <div className="w-full h-2 bg-plum-bg-bold"></div>
        </header>
    );
}

function SideButtons() {
    const { subpage, setSubpage } = SubpageStore();
    const { isExpanded, setIsExpanded } = SideBarExpansionStore();
    const { resetActiveChatState } = ActiveChatStore();
    const { resetPrompt } = ActivePromptStore();
    const { resetResponse } = ActiveResponseStore();
    const [mailsHover, setMailsHover] = useState(false);
    const [chatsHover, setChatsHover] = useState(false);

    useEffect(() => {
        if (subpage !== 'chats') {
            setIsExpanded(false);
        }
    }, [subpage])

    const handleNewChatBtn = () => {
        resetActiveChatState();
        resetPrompt();
        resetResponse();
    }

    const handleExpandSideBarBtn = () => {
        setIsExpanded(true);
    }

    const handleCollapseSideBarBtn = () => {
        setIsExpanded(false);
    }

    const containerClassBase = `
    bg-plum-surface cursor-pointer transition-all duration-500 ease-in-out
    hover:translate-x-0 flex items-center justify-between text-xl font-cabin rounded-tr-full rounded-br-full
    w-fit pl-2 p-1.25 mb-3
    font-semibold`;

    const containerClass = `
    bg-plum-surface cursor-pointer transition-all duration-500 ease-in-out
    hover:translate-x-0 flex items-center justify-between text-xl font-cabin rounded-tr-full rounded-br-full
    w-fit p-1.25 mb-3
    font-semibold`;
    const btnClassBase = `rounded-full bg-plum-primary h-8 w-8 flex items-center justify-center duration-200 cursor-pointer`;
    const btnClass = `rounded-full bg-plum-primary h-8 w-8 ml-3 flex items-center justify-center hover:scale-110 duration-200 cursor-pointer`;
    const iconClass = `auto cursor-pointer`;

    return (
        <div className="duration-200 select-none absolute mt-5">
            <div className={`${containerClass} ${subpage === 'mails' ? "text-plum-secondary" : "text-plum-primary"} ${mailsHover ? 'translate-x-0' : '-translate-x-[calc(100%-3rem)]'}`}
                onMouseEnter={() => setMailsHover(true)}
                onMouseLeave={() => setMailsHover(false)}
                onClick={() => setSubpage('mails')}
            >
                Mails
                <button className={`${btnClass} ${subpage === 'mails' ? 'bg-plum-secondary' : 'bg-plum-primary'}`} onClick={() => setSubpage('mails')}>
                    <img src="/mails-icon.svg" className={`${iconClass} h-4`} alt="mail icon" />
                </button>
            </div>

            <div className="flex items-start duration-500">
                <div className={`flex items-start z-30 duration-500 ${subpage === 'chats' ? 'translate-x-0' : '-translate-x-[100%]'}`}>
                    <div className={`
                            h-80 w-50
                            bg-plum-surface
                            rounded-tr-3xl
                            rounded-br-3xl
                            absolute
                            z-30
                            duration-400
                            ${subpage === 'chats' ? isExpanded ? 'translate-x-0' : '-translate-x-[100%]' : '-translate-x-[100%]'}
                        `}>
                        <div className="flex p-2 items-center justify-between">
                            <h3 className="text-[22px] flex gap-x-1 ml-1 font-semibold font-cabin">
                                <span className="font-semibold">
                                    Chats
                                </span>
                            </h3>
                            <div className="flex items-center gap-x-0.5">
                                <button className={`${btnClassBase} scale-90 hover:scale-100 ${subpage === 'chats' ? 'bg-plum-secondary' : 'bg-plum-primary'}`} onClick={() => handleNewChatBtn()} onMouseEnter={() => setChatsHover(true)} onMouseLeave={() => setChatsHover(false)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="27" height="27" viewBox="0 0 27 27" fill="none" className={`${iconClass} scale-120`} >
                                        <circle cx="13.2818" cy="13.2818" r="13.2818" fill="#403964" />
                                        <path d="M21.0603 12.974C21.0603 13.5517 20.5921 14.02 20.0144 14.02H16.3882C15.4769 14.02 14.7382 14.7587 14.7382 15.67V19.5596C14.7382 20.18 14.2352 20.683 13.6148 20.683C12.9943 20.683 12.4914 20.18 12.4914 19.5596V15.67C12.4914 14.7587 11.7526 14.02 10.8414 14.02H7.24614C6.66848 14.02 6.2002 13.5517 6.2002 12.974C6.2002 12.3964 6.66848 11.9281 7.24614 11.9281H10.8414C11.7526 11.9281 12.4914 11.1894 12.4914 10.2781V6.43494C12.4914 5.8145 12.9943 5.31152 13.6148 5.31152C14.2352 5.31152 14.7382 5.8145 14.7382 6.43494V10.2781C14.7382 11.1894 15.4769 11.9281 16.3882 11.9281H20.0144C20.5921 11.9281 21.0603 12.3964 21.0603 12.974Z" fill="white" />
                                    </svg>
                                </button>
                                <button className={`${btnClassBase} scale-90 hover:scale-100 bg-plum-primary`} onClick={() => handleCollapseSideBarBtn()}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="15" viewBox="0 0 13 15" fill="none" className={`${iconClass} ml-1 scale-130`}>
                                        <path d="M7.50033 11.6668L3.33366 7.50016L7.50033 11.6668ZM3.33366 7.50016L7.50033 3.3335L3.33366 7.50016ZM3.33366 7.50016H12.167H3.33366ZM0.833659 14.1668V0.833496V14.1668Z" fill="#7A5BB9" />
                                        <path d="M7.50033 11.6668L3.33366 7.50016M3.33366 7.50016L7.50033 3.3335M3.33366 7.50016H12.167M0.833659 14.1668V0.833496" stroke="#F7F2FF" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div>
                            {/* Lazy loaded chats here... */}
                        </div>
                    </div>
                    <div className={`${containerClassBase} z-20  
                            ${subpage === 'chats' ? "text-plum-secondary" : "text-plum-primary"} 
                            ${subpage === 'chats' ? 'translate-x-0' : '-translate-x-[100%]'}
                            `}>
                        <button className={`${btnClassBase} ml-1 hover:scale-110 ${subpage === 'chats' ? 'bg-plum-secondary' : 'bg-plum-primary'}`} onClick={() => handleNewChatBtn()} onMouseEnter={() => setChatsHover(true)} onMouseLeave={() => setChatsHover(false)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="27" height="27" viewBox="0 0 27 27" fill="none" className={`${iconClass} scale-120`} >
                                <circle cx="13.2818" cy="13.2818" r="13.2818" fill="#403964" />
                                <path d="M21.0603 12.974C21.0603 13.5517 20.5921 14.02 20.0144 14.02H16.3882C15.4769 14.02 14.7382 14.7587 14.7382 15.67V19.5596C14.7382 20.18 14.2352 20.683 13.6148 20.683C12.9943 20.683 12.4914 20.18 12.4914 19.5596V15.67C12.4914 14.7587 11.7526 14.02 10.8414 14.02H7.24614C6.66848 14.02 6.2002 13.5517 6.2002 12.974C6.2002 12.3964 6.66848 11.9281 7.24614 11.9281H10.8414C11.7526 11.9281 12.4914 11.1894 12.4914 10.2781V6.43494C12.4914 5.8145 12.9943 5.31152 13.6148 5.31152C14.2352 5.31152 14.7382 5.8145 14.7382 6.43494V10.2781C14.7382 11.1894 15.4769 11.9281 16.3882 11.9281H20.0144C20.5921 11.9281 21.0603 12.3964 21.0603 12.974Z" fill="white" />
                            </svg>
                        </button>
                        <button className={`${btnClassBase} hover:scale-110 ml-2 bg-plum-primary`} onClick={() => handleExpandSideBarBtn()}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13" fill="none" className={`${iconClass} scale-130`} >
                                <path d="M4.53103 1.25533V11.7391M2.56532 0.600098H10.4282C11.5138 0.600098 12.3939 1.48018 12.3939 2.56581V10.4287C12.3939 11.5143 11.5138 12.3944 10.4282 12.3944H2.56532C1.47969 12.3944 0.599609 11.5143 0.599609 10.4287V2.56581C0.599609 1.48018 1.47969 0.600098 2.56532 0.600098Z" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className={`${containerClass} absolute z-10 
                        ${subpage === 'chats' ? "text-plum-secondary -translate-x-[calc(100%-3rem)]" : "text-plum-primary"} 
                        ${subpage === 'chats' ? '-translate-x-[calc(100%-3rem)]' : chatsHover ? 'translate-x-0' : '-translate-x-[calc(100%-3rem)]'}
                    `}
                    onMouseEnter={() => setChatsHover(true)}
                    onMouseLeave={() => setChatsHover(false)}
                    onClick={() => setSubpage('chats')}
                >
                    Chats
                    <button className={`${btnClass} ${subpage === 'chats' ? 'bg-plum-secondary' : 'bg-plum-primary'}`} onClick={() => setSubpage('chats')}>
                        <img src="/chats-icon.svg" className={`${iconClass} h-5`} alt="chat icon" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function Home() {
    const { id } = useParams<string>();
    const navigate = useNavigate();
    const { subpage: section } = SubpageStore();
    const [subpage, setSubpage] = useState(<Mails />);
    const { mail } = useSelectedMailStore();
    const { args } = useStore(PopupFormStore);
    const { load } = args;

    useEffect(() => {
        if (!id && !gmailCookie) {
            navigate(`/signup?warning=unauthorized`, { replace: true });
            return;
        } else if (!id || id !== gmailCookie) {
            navigate(`/home/${gmailCookie}`, { replace: true });
            return;
        }
    }, [id, gmailCookie, navigate]);

    useUser();
    useCategories();
    useEffect(() => {
        if (section === 'mails') {
            setSubpage(<Mails />);
        } else if (section === 'chats') {
            setSubpage(<Chats />);
        }
    }, [section]);

    const wsConnection = useWebSocket();
    globals.wsConnection = wsConnection;

    return (
        <div className="h-screen w-screen relative overflow-x-hidden">
            <div className="relative z-10">
                <FormPopup />
            </div>
            <div className={`relative z-5 duration-300 ${load ? 'blur-[4px]' : 'blue-none'}`}>
                <Header />
                <div className="flex">
                    <SideButtons />
                    <components.FullMail mail={mail} />
                    {subpage}
                </div>
            </div>
        </div>
    );
}

export default Home;