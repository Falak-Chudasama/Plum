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
import SideButtons from "../components/SideButtons";

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