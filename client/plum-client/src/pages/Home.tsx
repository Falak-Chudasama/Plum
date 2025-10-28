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

const { PlumLogo } = components;
const { gmailCookie, pictureCookie } = utils.parseGmailCookies();

function Header() {
    const profileImage: string = pictureCookie;

    return (
        <header className="grid gap-y-1.5">
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
    const [mailsHover, setMailsHover] = useState(false);
    const [chatsHover, setChatsHover] = useState(false);

    const containerClass = `
    bg-plum-surface cursor-pointer transition-all duration-500 ease-in-out
    hover:translate-x-0 flex items-center justify-between text-xl font-cabin rounded-tr-full rounded-br-full
    w-fit pl-2 p-1.25 mb-3 
    font-semibold`;
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
            
            <div className={`${containerClass} ${subpage === 'chats' ? "text-plum-secondary" : "text-plum-primary"} ${chatsHover ? 'translate-x-0' : '-translate-x-[calc(100%-3rem)]'}`}
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

    useWebSocket();

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