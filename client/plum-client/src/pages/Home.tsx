import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import utils from "../utils/utils";
import components from "../components/components";
import Mails from "./subpages/Mails";

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
    const btnClass = 'block cursor-pointer mb-5'

    return (
        <div>
            <button className={btnClass}>Mails</button>
            <button className={btnClass}>Chat</button>
            <button className={btnClass}>Sent</button>
        </div>
    )
}

function Home() {
    const { id } = useParams<string>();
    const navigate = useNavigate();

    useEffect(() => {
        if (!id && !gmailCookie) {
            navigate(`/signup?warning=unauthorized`, { replace: true });
        } else if (!id || id !== gmailCookie) {
            navigate(`/home/${gmailCookie}`, { replace: true });
        }
    }, [id, gmailCookie, navigate]);

    return (
        <div>
            <Header />
            <SideButtons />
            <Mails />
        </div>
    );
}

export default Home;
