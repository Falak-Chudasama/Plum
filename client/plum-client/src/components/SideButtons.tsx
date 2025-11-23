import { useEffect, useState, useRef, useMemo } from "react";
import SubpageStore from "../store/SubpageStore";
import { useStore } from "zustand";
import SideBarExpansionStore from "../store/SideBarExpansionStore";
import ActiveChatStore from "../store/ActiveChatStore";
import ActivePromptStore from "../store/ActivePromptStore";
import ActiveResponseStore from "../store/ActiveResponseStore";
import ChatStore from "../store/ChatStore";
import apis from "../apis/apis";
import utils from "../utils/utils";
import globals from "../globals/globals";
import ChatCountStore from "../store/ChatCountStore";

const batchSize = 20;

function ChatMenu() {
    const chatList = useStore(ChatStore, s => s.chatList);

    const setChatList = ChatStore.getState().setChatList;
    const appendChatList = ChatStore.getState().appendChatList;

    const { chat, setChatState } = useStore(ActiveChatStore);
    const { setChatCount, resetChatCount } = useStore(ChatCountStore);

    const { sendCommand } = globals.wsConnection!;

    const newChatClicked = (_id: string) => {
        resetChatCount();
        sendCommand(`NEW_CHAT_CLICKED:${_id}`);
    }

    const scrollRef = useRef<HTMLDivElement | null>(null);
    const isFetchingRef = useRef(false);
    const tickingRef = useRef(false);

    const toISTDate = (timestamp: string | Date) => {
        const d = new Date(timestamp);
        return new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    };

    const ddmm = (dateLike: string | Date) => {
        const d = toISTDate(dateLike);
        const day = d.getDate().toString().padStart(2, "0");
        const month = (d.getMonth() + 1).toString().padStart(2, "0");
        return `${day}-${month}`;
    };

    const labelDate = (dateLike: string | Date) => {
        const d = toISTDate(dateLike);

        const today = toISTDate(new Date());
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const sameDay = (a: Date, b: Date) =>
            a.getDate() === b.getDate() &&
            a.getMonth() === b.getMonth() &&
            a.getFullYear() === b.getFullYear();

        if (sameDay(d, today)) return "Today";
        if (sameDay(d, yesterday)) return "Yesterday";

        return ddmm(d);
    };


    const fetchChatBatch = async () => {
        if (isFetchingRef.current) return;

        const state = ChatStore.getState().chatList;

        if (state.cursor !== null && !state.hasMore) return;

        const email = utils.parseGmailCookies().gmailCookie;
        if (!email) return;

        try {
            isFetchingRef.current = true;

            const res = await apis.getChatList(email, batchSize, state.cursor);
            const page = res?.result ?? { chats: [], nextCursor: null, hasMore: false };

            const incoming = {
                chats: page.chats ?? [],
                cursor: page.nextCursor ?? null,
                hasMore: Boolean(page.hasMore)
            };

            if (state.cursor === null || state.chats.length === 0) {
                setChatList(incoming);
            } else {
                appendChatList(incoming);
            }
        } catch (err) {
            console.error("fetchChatBatch error:", err);
        } finally {
            isFetchingRef.current = false;
        }
    };

    const grouped = useMemo(() => {
        const groups: Record<string, typeof chatList.chats> = {};
        for (const chat of chatList.chats) {
            const key = ddmm(chat.createdAt);
            if (!groups[key]) groups[key] = [];
            groups[key].push(chat);
        }
        return groups;
    }, [chatList.chats]);

    const handleChatClick = async (id: string) => {
        const response = await apis.getChatById(id);
        const clickedChat = response.result;
        if (clickedChat && clickedChat.messageCount > 0) {
            setChatState(clickedChat);
            newChatClicked(id);
            setChatCount(clickedChat.messageCount);
        }
    }

    useEffect(() => {
        fetchChatBatch();
    }, [chat]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const onScroll = () => {
            if (tickingRef.current) return;
            tickingRef.current = true;

            requestAnimationFrame(() => {
                const scrollPos = el.scrollTop + el.clientHeight;
                const total = el.scrollHeight;
                const percent = total > 0 ? scrollPos / total : 0;

                const state = ChatStore.getState().chatList;

                if (percent >= 0.9 && !isFetchingRef.current && state.hasMore) {
                    fetchChatBatch();
                }

                tickingRef.current = false;
            });
        };

        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
    }, [chatList]);

    return (
        <div
            ref={scrollRef}
            className="h-[100%] overflow-y-auto max-h-60"
            style={{ WebkitOverflowScrolling: "touch" }}
        >
            {Object.entries(grouped).length > 0 ? Object.entries(grouped).map(([date, chats]) => (
                <div key={date} className="mb-4 pr-4 mt-3 mr-2 ">
                    <div className="font-bold font-cabin text-plum-secondary mb-1 ml-4 flex items-center gap-x-1">
                        <div className="h-4 w-[2.5px] rounded-full bg-plum-secondary"></div>
                        <p>{labelDate(chats[0].createdAt)}</p>
                    </div>
                    {chats.map(chat => (
                        <div onClick={() => handleChatClick(chat._id)} key={chat._id} className="duration-200 hover:bg-plum-primary cursor-pointer hover:text-plum-bg rounded-tr-full rounded-br-full p-1 pl-5 pr-2 whitespace-nowrap overflow-hidden text-ellipsis">
                            {chat.title}
                        </div>
                    ))}
                </div>
            )) : <div className="h-[100%] w-full px-4 flex items-center justify-center text-center text-plum-secondary opacity-80">
                <span>
                    Seems like we've never had any conversation, <span className="font-bold font-cabin">let's start one...</span>
                </span>
            </div>}
        </div>
    );
}

function SideButtons() {
    const { subpage, setSubpage } = SubpageStore();
    const { isExpanded, setIsExpanded } = SideBarExpansionStore();
    const { resetActiveChatState } = ActiveChatStore();
    const { resetPrompt } = ActivePromptStore();
    const { resetResponse } = ActiveResponseStore();
    const { resetChatCount } = useStore(ChatCountStore);
    const [mailsHover, setMailsHover] = useState(false);
    const [chatsHover, setChatsHover] = useState(false);

    const { sendCommand } = globals.wsConnection!;

    const clearContext = () => {
        sendCommand('CLEAR_CONTEXT');
    }

    useEffect(() => {
        if (subpage !== 'chats') {
            setIsExpanded(false);
        }
    }, [subpage])

    const handleNewChatBtn = () => {
        resetChatCount();
        resetActiveChatState();
        resetPrompt();
        resetResponse();
        clearContext();
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
                        duration-400 shadow-plum-secondary-sm
                        ${subpage === 'chats' ? isExpanded ? 'translate-x-0' : '-translate-x-[100%]' : '-translate-x-[100%]'}
                    `}>
                        <div className="flex p-2 items-start justify-between">
                            <h3 className="text-[24px] flex gap-x-1 ml-1.5 font-semibold font-cabin">
                                <span className="font-semibold">
                                    Chats
                                </span>
                            </h3>
                            <div className="flex items-center gap-x-0.5">
                                <button
                                    className={`${btnClassBase} scale-90 hover:scale-100 ${subpage === 'chats' ? 'bg-plum-secondary' : 'bg-plum-primary'}`}
                                    onClick={() => handleNewChatBtn()}
                                    onMouseEnter={() => setChatsHover(true)}
                                    onMouseLeave={() => setChatsHover(false)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="27" height="27" viewBox="0 0 27 27" fill="none" className={`${iconClass} scale-120`}>
                                        <circle cx="13.2818" cy="13.2818" r="13.2818" fill="#403964" />
                                        <path
                                            d="M21.0603 12.974C21.0603 13.5517 20.5921 14.02 20.0144 14.02H16.3882C15.4769 14.02 14.7382 14.7587 14.7382 15.67V19.5596C14.7382 20.18 14.2352 20.683 13.6148 20.683C12.9943 20.683 12.4914 20.18 12.4914 19.5596V15.67C12.4914 14.7587 11.7526 14.02 10.8414 14.02H7.24614C6.66848 14.02 6.2002 13.5517 6.2002 12.974C6.2002 12.3964 6.66848 11.9281 7.24614 11.9281H10.8414C11.7526 11.9281 12.4914 11.1894 12.4914 10.2781V6.43494C12.4914 5.8145 12.9943 5.31152 13.6148 5.31152C14.2352 5.31152 14.7382 5.8145 14.7382 6.43494V10.2781C14.7382 11.1894 15.4769 11.9281 16.3882 11.9281H20.0144C20.5921 11.9281 21.0603 12.3964 21.0603 12.974Z"
                                            fill="white"
                                        />
                                    </svg>
                                </button>

                                <button
                                    className={`${btnClassBase} scale-90 hover:scale-100 bg-plum-primary`}
                                    onClick={() => handleCollapseSideBarBtn()}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="15" viewBox="0 0 13 15" fill="none" className={`${iconClass} ml-1 scale-130`}>
                                        <path
                                            d="M7.50033 11.6668L3.33366 7.50016L7.50033 11.6668ZM3.33366 7.50016L7.50033 3.3335L3.33366 7.50016ZM3.33366 7.50016H12.167H3.33366ZM0.833659 14.1668V0.833496V14.1668Z"
                                            fill="#7A5BB9"
                                        />
                                        <path
                                            d="M7.50033 11.6668L3.33366 7.50016M3.33366 7.50016L7.50033 3.3335M3.33366 7.50016H12.167M0.833659 14.1668V0.833496"
                                            stroke="#F7F2FF"
                                            strokeWidth="1.66667"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <ChatMenu />
                    </div>

                    <div
                        className={`${containerClassBase} z-20  
                            ${subpage === 'chats' ? "text-plum-secondary" : "text-plum-primary"} 
                            ${subpage === 'chats' ? 'translate-x-0' : '-translate-x-[100%]'}
                        `}>
                        <button
                            className={`${btnClassBase} ml-1 hover:scale-110 ${subpage === 'chats' ? 'bg-plum-secondary' : 'bg-plum-primary'}`}
                            onClick={() => handleNewChatBtn()}
                            onMouseEnter={() => setChatsHover(true)}
                            onMouseLeave={() => setChatsHover(false)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="27" height="27" viewBox="0 0 27 27" fill="none" className={`${iconClass} scale-120`}>
                                <circle cx="13.2818" cy="13.2818" r="13.2818" fill="#403964" />
                                <path
                                    d="M21.0603 12.974C21.0603 13.5517 20.5921 14.02 20.0144 14.02H16.3882C15.4769 14.02 14.7382 14.7587 14.7382 15.67V19.5596C14.7382 20.18 14.2352 20.683 13.6148 20.683C12.9943 20.683 12.4914 20.18 12.4914 19.5596V15.67C12.4914 14.7587 11.7526 14.02 10.8414 14.02H7.24614C6.66848 14.02 6.2002 13.5517 6.2002 12.974C6.2002 12.3964 6.66848 11.9281 7.24614 11.9281H10.8414C11.7526 11.9281 12.4914 11.1894 12.4914 10.2781V6.43494C12.4914 5.8145 12.9943 5.31152 13.6148 5.31152C14.2352 5.31152 14.7382 5.8145 14.7382 6.43494V10.2781C14.7382 11.1894 15.4769 11.9281 16.3882 11.9281H20.0144C20.5921 11.9281 21.0603 12.3964 21.0603 12.974Z"
                                    fill="white"
                                />
                            </svg>
                        </button>

                        <button
                            className={`${btnClassBase} hover:scale-110 ml-2 bg-plum-primary`}
                            onClick={() => handleExpandSideBarBtn()}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13" fill="none" className={`${iconClass} scale-130`}>
                                <path
                                    d="M4.53103 1.25533V11.7391M2.56532 0.600098H10.4282C11.5138 0.600098 12.3939 1.48018 12.3939 2.56581V10.4287C12.3939 11.5143 11.5138 12.3944 10.4282 12.3944H2.56532C1.47969 12.3944 0.599609 11.5143 0.599609 10.4287V2.56581C0.599609 1.48018 1.47969 0.600098 2.56532 0.600098Z"
                                    stroke="white"
                                    strokeWidth="1.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
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
                    onClick={() => setSubpage('chats')}>
                    Chats
                    <button className={`${btnClass} ${subpage === 'chats' ? 'bg-plum-secondary' : 'bg-plum-primary'}`} onClick={() => setSubpage('chats')}>
                        <img src="/chats-icon.svg" className={`${iconClass} h-5`} alt="chat icon" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SideButtons;