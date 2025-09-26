import { useEffect, useState, useMemo } from "react";
import type { InboundEmailType } from "../types/types";
import useSelectedMailStore from "../store/SelectedMailStore";
import constants from "../constants/constants";
import useCategories from "../hooks/useCategories";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const colorMap = constants.colorMap;
type ColorMapKey = keyof typeof colorMap;

function getColorsFromCategoryColor(colorVal?: string) {
    if (!colorVal) return colorMap.gray;

    if (colorVal.startsWith("#")) {
        return { dark: colorVal, light: colorVal + "26" };
    }

    const key = colorVal as ColorMapKey;
    if (key in colorMap) return colorMap[key];

    return colorMap.gray;
}

function CategoryComp({ title, categoriesData }: { title: string; categoriesData?: CategoryType[] }) {
    if (!categoriesData) return null;
    const cat = categoriesData.find((c) =>
        (c as any).category === title
    );

    if (!cat) {
        return null;
    }

    const { dark, light } = getColorsFromCategoryColor((cat as any).color);

    return (
        <div className="w-fit font-cabin border-2 pl-1.5 pr-2 text-sm font-medium rounded-full flex items-center gap-x-2 select-none"
            style={{ backgroundColor: light, borderColor: dark }}>
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: dark }} />
            <p style={{ color: dark }}>{title}</p>
        </div>
    );
}

function modifiedTime(time?: string): string {
    if (!time) return "";
    const [hoursStr, minutes] = time.split(":");
    let hours = parseInt(hoursStr, 10);
    if (Number.isNaN(hours)) return time;
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}

function timeAgoFrom(dateInput?: string | number | Date): string {
    if (!dateInput) return "";
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const diff = Date.now() - d.getTime();
    if (Number.isNaN(diff) || diff < 0) return "";
    const sec = Math.floor(diff / 1000);
    if (sec < 10) return "just now";
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo`;
    const years = Math.floor(months / 12);
    return `${years}y`;
}

function MailContent({ mail }: { mail: InboundEmailType }) {
    const subject = mail.subject ?? 'No Subject';
    const senderName = mail.senderName;
    const senderEmail = mail.senderEmail;
    let recieverEmail = mail.to!;
    const time = modifiedTime(mail.parsedDate?.time);
    const categories = mail.categories ?? ['Other'];
    const body = mail.bodyText;
    const attachments = mail.attachments.map((a) => a.filename);
    const timeAgo = useMemo(() => timeAgoFrom(mail.timestamp), [mail.timestamp]);

    const { data: categoriesData = [], isLoading: categoriesLoading } = useCategories();

    let categoryComps = categories.map((title, idx) => (
        <CategoryComp key={`${title}-${idx}`} title={title} categoriesData={categoriesData} />
    )).filter((comp) => comp !== null);

    if (recieverEmail.split(',').length > 1) {
        recieverEmail = recieverEmail?.split(',')
            .map((email) => {
                let e = email.split(' ');
                return e[e.length - 1].trim();
            })
            .map((email) => {
                return email.split('').filter((e) => (e !== '<' && e !== '>')).join('');
            }).join(', ');
    } else if (recieverEmail.split('<').length > 1) {
        recieverEmail = recieverEmail.split(' ');
        recieverEmail = recieverEmail[recieverEmail.length - 1];
        recieverEmail = recieverEmail.trim().split('').filter((c) => (c !== '<' && c !== '>'));
    }

    return (
        <div className="text-lg max-w-2xl">
            Name: {senderName} <br></br>
            From: {senderEmail} <br></br>
            To: <p className="text-plum-primary"> {recieverEmail} </p>
            time: {time} <br></br>
            Categories: {categoryComps}
            Subject: {subject} <br></br>
            <p className="max-h-40 overflow-y-scroll w-fit text-sm">
                Body: {<ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>}
            </p>
            Attachment: {attachments.join(' &&&&&&& ')} <br></br>
            Time Ago: {timeAgo}
        </div>
    )
}

function FullMail({ mail = null }: { mail: InboundEmailType | null }) {
    const { removeMail } = useSelectedMailStore();
    const [showMail, setShowMail] = useState(mail !== null);

    useEffect(() => {
        if (mail !== null) {
            setShowMail(true);
        }
    }, [mail])

    const handleCancelBtnClick = () => {
        setShowMail(false);
        setTimeout(() => {
            removeMail();
        }, 300);
    };

    return (
        <div className={`fixed min-h-60 min-w-20 max-w-160 w-fit z-50 duration-250 bottom-0 right-0 flex justify-end ${!showMail ? "translate-x-full" : "translate-x-0"}`}>
            <div className="place-items-end pb-10 pr-5">
                <button className="bg-plum-bg-bold text-lg font-medium font-cabin px-4 pt-0.25 rounded-t-xl mr-5 text-plum-primary hover:bg-red-700 hover:text-plum-bg cursor-pointer block duration-350 shadow-plum-secondary-xs" onClick={() => handleCancelBtnClick()}>
                    Close
                </button>
                <div className="bg-white h-full w-full shadow-plum-secondary-xl p-2">
                    {
                        mail === null ? (<div className="text-lg max-w-2xl">
                            No Mail Chosen
                        </div>) : (
                            <MailContent mail={mail} />
                        )
                    }
                </div>
            </div>
        </div>
    );
}
export default FullMail