import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import utils from "../utils/utils";
import components from "../components/components";
import Mails from "./subpages/Mails";
import Chats from "./subpages/Chat";
import Outbox from "./subpages/Outbox";
import SectionStore from "../store/SectionStore";

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
    const { section, setSection } = SectionStore();
    const [mailsHover, setMailsHover] = useState(false);
    const [chatsHover, setChatsHover] = useState(false);
    const [outboxHover, setOutboxHover] = useState(false);

    const containerClass = `
    bg-plum-surface cursor-pointer transition-all duration-500 ease-in-out
    hover:translate-x-0 flex items-center justify-between text-xl font-cabin rounded-tr-full rounded-br-full
    w-fit pl-2 p-1.25 mb-3 
    font-semibold`;
    const btnClass = `rounded-full bg-plum-primary h-8 w-8 ml-3 flex items-center justify-center hover:scale-110 duration-200 cursor-pointer`;
    const iconClass = `auto cursor-pointer`;

    return (
        <div className="mt-8 duration-200 select-none">
            <div className={`${containerClass} ${section === 'mails' ? "text-plum-secondary" : "text-plum-primary"} ${mailsHover ? 'translate-x-0' : '-translate-x-[calc(100%-3rem)]'}`}
                onMouseEnter={() => setMailsHover(true)}
                onMouseLeave={() => setMailsHover(false)}
                onClick={() => setSection('mails')}
                >
                    Mails
                <button className={`${btnClass} ${section === 'mails' ? 'bg-plum-secondary' : 'bg-plum-primary'}`} onClick={() => setSection('mails')}>
                    <img src="/mails-icon.svg" className={`${iconClass} h-4`} alt="mail icon" />
                </button>
            </div>
            
            <div className={`${containerClass} ${section === 'chats' ? "text-plum-secondary" : "text-plum-primary"} ${chatsHover ? 'translate-x-0' : '-translate-x-[calc(100%-3rem)]'}`}
                onMouseEnter={() => setChatsHover(true)}
                onMouseLeave={() => setChatsHover(false)}
                onClick={() => setSection('chats')}
                >
                    Chats
                <button className={`${btnClass} ${section === 'chats' ? 'bg-plum-secondary' : 'bg-plum-primary'}`} onClick={() => setSection('chats')}>
                    <img src="/chats-icon.svg" className={`${iconClass} h-5`} alt="chat icon" />
                </button>
            </div>
            
            <div className={`${containerClass} ${section === 'outbox' ? "text-plum-secondary" : "text-plum-primary"} ${outboxHover ? 'translate-x-0' : '-translate-x-[calc(100%-3rem)]'}`}
                onMouseEnter={() => setOutboxHover(true)}
                onMouseLeave={() => setOutboxHover(false)}
                onClick={() => setSection('outbox')}
                >
                    Outbox
                <button className={`${btnClass} ${section === 'outbox' ? 'bg-plum-secondary' : 'bg-plum-primary'}`} onClick={() => setSection('outbox')}>
                    <img src="/outbox-icon.svg" className={`${iconClass} h-5.5 mt-1 ml-[-3px]`} alt="outbox icon" />
                </button>
            </div>
        </div>
    );
}

function Home() {
    const { id } = useParams<string>();
    const navigate = useNavigate();
    const { section } = SectionStore();
    const [subpage, setSubpage] = useState(<Mails />);

    useEffect(() => {
        if (!id && !gmailCookie) {
            navigate(`/signup?warning=unauthorized`, { replace: true });
        } else if (!id || id !== gmailCookie) {
            navigate(`/home/${gmailCookie}`, { replace: true });
        }
    }, [id, gmailCookie, navigate]);

    useEffect(() => {
        if (section === 'mails') {
            setSubpage(<Mails />);
        } else if (section === 'chats') {
            setSubpage(<Chats />);
        } else if (section === 'outbox') {
            setSubpage(<Outbox />);
        }
    }, [section])

    return (
        <div>
            <Header />
            <div className="flex">
                <SideButtons />
                {subpage}
            </div>
        </div>
    );
}

export default Home;